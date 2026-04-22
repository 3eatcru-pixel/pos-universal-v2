import { integrationLayer } from '../../../integration/integrationLayer';
import { meshNetwork } from '../../../services/p2pSync';
import { SyncEvent } from '../../../core/types';
import { dbLocal } from '../../../services/db';
import { logger } from '../../../core/services/logger';
import { saleRepository } from '../../../core/storage/repositories/saleRepository';
import { productRepository } from '../../../core/storage/repositories/productRepository';
import { Sale, SaleItem } from '../../../core/storage/types';

export interface RetailVariation {
  sku: string;
  size?: string;
  color?: string;
  voltage?: '110v' | '220v' | 'bivolt';
  stock: number;
}

export interface RetailCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  tags: string[];
  lastPurchase?: number;
  totalSpent: number;
  // Custom Fields
  preferences?: string[]; // e.g., ['Summer Collection', 'Sustainable Materials']
  returnHistory?: { date: number, reason: string, productId: string }[];
  emergencyContact?: { name: string, phone: string, relation: string };
}

export interface RetailPromotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_get_free';
  value: number;
  startDate: number;
  endDate: number;
  productId?: string;
  category?: string;
}

export interface SerialNumber {
  serial: string;
  productId: string;
  status: 'available' | 'sold' | 'returned';
}

export interface Warranty {
  id: string;
  saleId: string;
  productId: string;
  serialNumber?: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'voided';
}

export interface Installment {
  number: number;
  amount: number;
  dueDate: number;
  status: 'pending' | 'paid' | 'overdue';
}

class RetailService {
  constructor() {
    this.registerSyncListeners();
  }

  registerSyncListeners() {
    meshNetwork.setOnSync((event: SyncEvent) => {
      switch (event.type) {
        case 'RETAIL_SALE':
          void this.handleRetailSale(event.payload);
          break;
        case 'WARRANTY_GEN':
          this.handleWarrantyGen(event.payload);
          break;
      }
    });
  }

  async processSale(saleData: any) {
    const sale = this.toSaleEntity(saleData, false);
    const existingSale = await saleRepository.findById(sale.id);
    if (existingSale) {
      logger.log('retail', 'SALE_DUPLICATE_IGNORED', { saleId: sale.id, source: 'local_process' });
      return { success: true, duplicate: true, saleId: sale.id };
    }

    // Persist first to guarantee offline durability before broadcast.
    await saleRepository.create(sale);
    logger.log('retail', 'SALE_SAVED_LOCAL', { saleId: sale.id, total: sale.total });

    await productRepository.applySaleItems(sale.items);
    this.logProductUpdates(sale.items, 'local_process');

    await this.decrementLegacyInventory(sale.items, true);

    meshNetwork.emitEvent('RETAIL_SALE', sale);
    logger.log('retail', 'SALE_SYNC_SENT', { saleId: sale.id, items: sale.items.length });

    const rawItems = Array.isArray(saleData.items) ? saleData.items : [];
    rawItems.forEach((item: any) => {
      if (item.hasWarranty) {
        this.generateWarranty(sale.id, item);
      }
    });

    this.emitSaleUpdateEvent('local', sale.id);

    return await integrationLayer.registerSale('retail', sale as any, sale.items);
  }

  private async decrementLegacyInventory(items: SaleItem[], updateCoreStock: boolean) {
    const inventory = (await dbLocal.get('inventory')) || [];
    if (!Array.isArray(inventory) || inventory.length === 0) {
      console.warn('[RETAIL] Inventory is empty or unavailable for stock decrement.');
      return;
    }

    let changed = false;

    for (const item of items) {
      const soldQuantity = Number(item.quantity);
      if (!item?.productId || soldQuantity <= 0) {
        continue;
      }

      const invIndex = inventory.findIndex((inv: any) => {
        const sameId = String(inv?.id) === String(item.productId);
        const sameName =
          typeof inv?.name === 'string' &&
          typeof item?.name === 'string' &&
          inv.name.trim().toLowerCase() === item.name.trim().toLowerCase();
        return sameId || sameName;
      });

      if (invIndex < 0) {
        console.error(`[RETAIL] Product not found for stock decrement: ${item.productId}`);
        continue;
      }

      const currentStock = Number(inventory[invIndex]?.currentStock || 0);
      if (currentStock < soldQuantity) {
        console.error(
          `[RETAIL] Insufficient stock for product ${item.productId}. Available: ${currentStock}, Requested: ${soldQuantity}`
        );
        continue;
      }

      inventory[invIndex] = {
        ...inventory[invIndex],
        currentStock: currentStock - soldQuantity,
      };

      changed = true;
      if (updateCoreStock) {
        await integrationLayer.updateStock('retail', item.productId, -soldQuantity);
      }
    }

    if (changed) {
      await dbLocal.set('inventory', inventory);
    }
  }

  private async handleRetailSale(payload: any) {
    const sale = this.toSaleEntity(payload, true);
    const existingSale = await saleRepository.findById(sale.id);

    if (existingSale) {
      logger.log('retail', 'SALE_DUPLICATE_IGNORED', { saleId: sale.id, source: 'sync_receive' });
      return;
    }

    await saleRepository.create(sale);
    logger.log('retail', 'SALE_SYNC_RECEIVED', { saleId: sale.id, total: sale.total });

    await productRepository.applySaleItems(sale.items);
    this.logProductUpdates(sale.items, 'sync_receive');

    await this.decrementLegacyInventory(sale.items, false);
    this.emitSaleUpdateEvent('remote', sale.id);
  }

  private toSaleEntity(rawSale: any, synced: boolean): Sale {
    const rawItems = Array.isArray(rawSale?.items) ? rawSale.items : [];
    const items: SaleItem[] = rawItems.map((item: any) => ({
      productId: String(item?.productId || item?.id || ''),
      name: String(item?.name || 'Unknown Product'),
      quantity: Number(item?.quantity || 0),
      unitPrice: Number(item?.unitPrice ?? item?.price ?? 0),
      totalPrice: Number(item?.totalPrice ?? (Number(item?.quantity || 0) * Number(item?.unitPrice ?? item?.price ?? 0))),
    }));

    const saleId = String(rawSale?.id || `sale_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const createdAt =
      typeof rawSale?.createdAt === 'string'
        ? rawSale.createdAt
        : typeof rawSale?.createdAt === 'number'
          ? new Date(rawSale.createdAt).toISOString()
          : new Date().toISOString();

    return {
      id: saleId,
      createdAt,
      subtotal: Number(rawSale?.subtotal || 0),
      tax: Number(rawSale?.tax || 0),
      total: Number(rawSale?.total || 0),
      paymentMethod: String(rawSale?.paymentMethod || 'unknown'),
      synced,
      items,
    };
  }

  private logProductUpdates(items: SaleItem[], source: 'local_process' | 'sync_receive') {
    for (const item of items) {
      logger.log('retail', 'PRODUCT_UPDATED_LOCAL', {
        saleSource: source,
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  private emitSaleUpdateEvent(source: 'local' | 'remote', saleId: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('retail:sale-updated', {
        detail: { source, saleId, timestamp: Date.now() },
      })
    );
  }

  private async generateWarranty(saleId: string, item: any) {
    const warranty: Warranty = {
      id: `war-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      saleId,
      productId: item.productId,
      serialNumber: item.serial,
      startDate: Date.now(),
      endDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year default
      status: 'active'
    };

    meshNetwork.emitEvent('WARRANTY_GEN', warranty);
  }

  private handleWarrantyGen(payload: Warranty) {
    console.log('[RETAIL] New warranty generated', payload.id);
  }
}

export const retailService = new RetailService();
