import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Staff, 
  Shop, 
  Product, 
  Order, 
  Table, 
  InventoryItem, 
  Shift, 
  Reservation,
  Printer,
  IncidentReport,
  AppNotification,
  RolePermissions
} from '../types';

import { dataPipeline } from './dataPipeline';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'none',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    console.error('Firestore Permission Denied:', errorInfo);
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const firebaseService = {
  // ... existing methods ...
  saveSecureBackup: async (enterpriseId: string, data: any, key: string) => {
    const chunks = dataPipeline.pack(data, key);
    const backupId = `backup-${Date.now()}`;
    try {
      await setDoc(doc(db, 'backups', backupId), {
        enterpriseId,
        timestamp: Date.now(),
        chunks,
        chunkCount: chunks.length,
        method: 'AES-256 + LZ-String'
      });
      return backupId;
    } catch (e) {
      return handleFirestoreError(e, 'create', `backups/${backupId}`);
    }
  },

  getSecureBackup: async (backupId: string, key: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'backups', backupId));
      if (docSnap.exists()) {
        const { chunks } = docSnap.data();
        return dataPipeline.unpack(chunks, key);
      }
      throw new Error('Backup not found');
    } catch (e) {
      return handleFirestoreError(e, 'get', `backups/${backupId}`);
    }
  },
  // Generic collection listener scoped by enterprise and optionally shop
  subscribeCollection: (colName: string, enterpriseId: string | null, shopId: string | null, callback: (data: any[]) => void) => {
    let q = query(collection(db, colName));
    
    const conditions = [];
    const globalCollections = ['masterKeys', 'enterprises'];
    
    if (enterpriseId && !globalCollections.includes(colName)) {
      conditions.push(where('enterpriseId', '==', enterpriseId));
    }
    if (shopId && colName !== 'shops' && colName !== 'staff') {
      conditions.push(where('shopId', '==', shopId));
    }
    
    if (conditions.length > 0) {
      q = query(collection(db, colName), ...conditions);
    }

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, 'list', colName);
    });
  },

  // Staff (Scoped per enterprise)
  subscribeStaff: (enterpriseId: string | null, callback: (data: Staff[]) => void) => {
    let q = query(collection(db, 'staff'));
    if (enterpriseId) {
      q = query(collection(db, 'staff'), where('enterpriseId', '==', enterpriseId));
    }
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Staff));
    }, (error) => {
      handleFirestoreError(error, 'list', 'staff');
    });
  },

  // Save/Update Helpers
  saveItem: async (colName: string, id: string, data: any) => {
    try {
      await setDoc(doc(db, colName, id), data, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'create', `${colName}/${id}`);
    }
  },

  addItem: async (colName: string, data: any) => {
    try {
      const docRef = await addDoc(collection(db, colName), data);
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', colName);
    }
  },

  updateItem: async (colName: string, id: string, data: any) => {
    try {
      await updateDoc(doc(db, colName, id), data);
    } catch (e) {
      handleFirestoreError(e, 'update', `${colName}/${id}`);
    }
  },

  deleteItem: async (colName: string, id: string) => {
    try {
      await deleteDoc(doc(db, colName, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `${colName}/${id}`);
    }
  },

  getAllDocs: async (colName: string, enterpriseId?: string) => {
    try {
      let q = query(collection(db, colName));
      if (enterpriseId) {
        q = query(collection(db, colName), where('enterpriseId', '==', enterpriseId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) {
      return handleFirestoreError(e, 'list', colName);
    }
  },

  // Specific Actions
  placeOrder: async (order: Order) => {
    const { id, ...data } = order;
    await setDoc(doc(db, 'orders', id), data);
  },

  closeOrder: async (orderId: string, payments: any[], paymentMethod: string) => {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'delivered',
      closedAt: Date.now(),
      payments,
      paymentMethod
    });
  },

  updateTableStatus: async (tableId: string, status: string, orderId?: string) => {
    const data: any = { status };
    if (orderId) data.currentOrderId = orderId;
    else data.currentOrderId = null;
    await updateDoc(doc(db, 'tables', tableId), data);
  },

  seedData: async (data: {
    shops: Shop[],
    staff: Staff[],
    products: Product[],
    tables: Table[],
    orders?: Order[],
    inventory: InventoryItem[],
    permissions: RolePermissions[],
    printers: Printer[],
    businessConfigs?: any[],
    staffSchedules?: any[]
  }) => {
    const batch = writeBatch(db);
    
    data.shops.forEach(s => batch.set(doc(db, 'shops', s.id), s));
    data.staff.forEach(s => batch.set(doc(db, 'staff', s.id), s));
    data.products.forEach(p => batch.set(doc(db, 'products', p.id), p));
    data.tables.forEach(t => batch.set(doc(db, 'tables', t.id), t));
    if (data.orders) {
      data.orders.forEach(o => batch.set(doc(db, 'orders', o.id), o));
    }
    data.inventory.forEach(i => batch.set(doc(db, 'inventory', i.id), i));
    data.permissions.forEach(p => batch.set(doc(db, 'rolePermissions', p.role), p));
    data.printers.forEach(p => batch.set(doc(db, 'printers', p.id), p));
    if (data.businessConfigs) {
      data.businessConfigs.forEach(c => batch.set(doc(db, 'businessConfigs', c.id), c));
    }
    if (data.staffSchedules) {
      data.staffSchedules.forEach(s => batch.set(doc(db, 'staffSchedules', s.id), s));
    }

    await batch.commit();
  }
};
