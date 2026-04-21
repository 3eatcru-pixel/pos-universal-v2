import { CoreProduct, CoreSale } from '../types';
import { logger } from './logger';

class SalesService {
  async processSale(sale: CoreSale, products: CoreProduct[]) {
    logger.log('core', 'Processing generic sale', { saleId: sale.id, total: sale.total });
    // Core sale logic: update inventory, save to DB
    return { success: true, timestamp: Date.now() };
  }
}

class ProductService {
  async updateInventory(productId: string, quantity: number) {
    logger.log('core', 'Updating base inventory', { productId, quantity });
  }
}

export const coreSalesService = new SalesService();
export const coreProductService = new ProductService();
