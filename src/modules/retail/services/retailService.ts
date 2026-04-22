import { integrationLayer } from '../../../integration/integrationLayer';
import { meshNetwork } from '../../../services/p2pSync';
import { SyncEvent } from '../../../core/types';

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
          this.handleRetailSale(event.payload);
          break;
        case 'WARRANTY_GEN':
          this.handleWarrantyGen(event.payload);
          break;
      }
    });
  }

  async processSale(saleData: any) {
    // 1. Send to P2P network
    meshNetwork.emitEvent('RETAIL_SALE', saleData);
    
    // 2. Generate warranties for eligible items
    saleData.items.forEach((item: any) => {
      if (item.hasWarranty) {
        this.generateWarranty(saleData.id, item);
      }
    });

    return await integrationLayer.registerSale('retail', saleData, saleData.items);
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

  private handleRetailSale(payload: any) {
    console.log('[RETAIL] Syncing sale from network', payload.id);
  }

  private handleWarrantyGen(payload: Warranty) {
    console.log('[RETAIL] New warranty generated', payload.id);
  }
}

export const retailService = new RetailService();
