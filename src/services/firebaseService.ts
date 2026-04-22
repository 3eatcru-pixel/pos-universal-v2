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
  writeBatch,
  runTransaction
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

const GLOBAL_COLLECTIONS = new Set(['masterKeys', 'enterprises']);
const TENANT_SCOPED_COLLECTIONS = new Set([
  'shops',
  'staff',
  'products',
  'orders',
  'tables',
  'inventory',
  'backups',
  'settings',
  'shifts',
  'reservations',
  'printers',
  'incidentReports',
  'notifications',
  'recountRequests',
  'businessConfigs',
  'staffSchedules',
  'rolePermissions',
  'transactions',
  'performance_events',
  'suppliers',
  'supplier_contracts',
  'services',
  'resources',
]);

function getLocalTenantId(): string | null {
  try {
    const user = localStorage.getItem('pos_current_user')
      ? JSON.parse(localStorage.getItem('pos_current_user')!)
      : null;
    return user?.companyId || localStorage.getItem('rm_enterprise_id') || null;
  } catch {
    return localStorage.getItem('rm_enterprise_id') || null;
  }
}

function resolveTenantId(data?: any): string | null {
  return data?.companyId || data?.enterpriseId || getLocalTenantId();
}

function withTenantMetadata(colName: string, data: any): any {
  if (!TENANT_SCOPED_COLLECTIONS.has(colName)) return data;
  const tenantId = resolveTenantId(data);
  if (!tenantId) return data;
  return {
    ...data,
    companyId: data?.companyId || tenantId,
    enterpriseId: data?.enterpriseId || tenantId,
  };
}

function assertTenantContext(colName: string, data?: any): void {
  if (!TENANT_SCOPED_COLLECTIONS.has(colName)) return;
  const tenantId = resolveTenantId(data);
  if (!tenantId) {
    throw new Error(`Tenant ausente para coleção sensível: ${colName}`);
  }
}

function getRolePermissionDocId(role: string, tenantId: string | null): string {
  if (!tenantId) return role;
  return `rp_${tenantId}_${role}`;
}

function normalizeRolePermissionDocId(id: string, data?: any): string {
  if (id.startsWith('rp_')) return id;
  const role = data?.role || id;
  const tenantId = resolveTenantId(data);
  return getRolePermissionDocId(role, tenantId);
}

export const firebaseService = {
  // ... existing methods ...
  saveSecureBackup: async (enterpriseId: string, data: any, key: string) => {
    const chunks = dataPipeline.pack(data, key);
    const backupId = `backup-${Date.now()}`;
    try {
      await setDoc(doc(db, 'backups', backupId), {
        companyId: enterpriseId,
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
    if (TENANT_SCOPED_COLLECTIONS.has(colName) && !enterpriseId) {
      callback([]);
      return () => {};
    }

    let q = query(collection(db, colName));
    
    const conditions = [];
    
    if (enterpriseId && !GLOBAL_COLLECTIONS.has(colName)) {
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
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docId = colName === 'rolePermissions'
        ? normalizeRolePermissionDocId(id, payload)
        : id;
      await setDoc(doc(db, colName, docId), payload, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'create', `${colName}/${id}`);
    }
  },

  addItem: async (colName: string, data: any) => {
    try {
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docRef = await addDoc(collection(db, colName), payload);
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', colName);
    }
  },

  updateItem: async (colName: string, id: string, data: any) => {
    try {
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docId = colName === 'rolePermissions'
        ? normalizeRolePermissionDocId(id, payload)
        : id;
      await updateDoc(doc(db, colName, docId), payload);
    } catch (e) {
      handleFirestoreError(e, 'update', `${colName}/${id}`);
    }
  },

  deleteItem: async (colName: string, id: string) => {
    try {
      assertTenantContext(colName);
      if (colName === 'rolePermissions' && !id.startsWith('rp_')) {
        const tenantId = getLocalTenantId();
        if (tenantId) {
          const snapshot = await getDocs(
            query(
              collection(db, 'rolePermissions'),
              where('enterpriseId', '==', tenantId),
              where('role', '==', id),
            ),
          );
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => batch.delete(doc(db, 'rolePermissions', d.id)));
          await batch.commit();
          return;
        }
      }
      await deleteDoc(doc(db, colName, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `${colName}/${id}`);
    }
  },

  getAllDocs: async (colName: string, enterpriseId?: string) => {
    try {
      if (TENANT_SCOPED_COLLECTIONS.has(colName) && !enterpriseId) return [];
      let q = query(collection(db, colName));
      if (enterpriseId) {
        q = query(collection(db, colName), where('enterpriseId', '==', enterpriseId));
      }
      const snapshot = await getDocs(q);
      if (enterpriseId && snapshot.docs.length === 0) {
        const fallback = await getDocs(query(collection(db, colName), where('companyId', '==', enterpriseId)));
        return fallback.docs.map(d => ({ ...d.data(), id: d.id }));
      }
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) {
      return handleFirestoreError(e, 'list', colName);
    }
  },

  // Specific Actions
  placeOrder: async (order: Order) => {
    const { id, ...data } = order;
    await setDoc(doc(db, 'orders', id), withTenantMetadata('orders', data));
  },

  consumeMasterKey: async (rawKey: string, context: { usedBy: string; enterpriseId: string; deviceId?: string }) => {
    const normalizedKey = rawKey.trim().toUpperCase();
    if (!normalizedKey) {
      return { ok: false, reason: 'empty_key' as const };
    }

    try {
      const keyQuery = query(collection(db, 'masterKeys'), where('key', '==', normalizedKey), limit(1));
      const keySnapshot = await getDocs(keyQuery);

      if (keySnapshot.empty) {
        return { ok: false, reason: 'invalid_key' as const };
      }

      const keyDoc = keySnapshot.docs[0];
      const keyRef = doc(db, 'masterKeys', keyDoc.id);
      const now = Date.now();

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(keyRef);
        if (!snap.exists()) {
          throw new Error('invalid_key');
        }

        const data = snap.data() as any;
        if (data.revokedAt) throw new Error('revoked_key');
        if (data.used) throw new Error('already_used');
        if (data.expiresAt && data.expiresAt < now) throw new Error('expired_key');

        tx.update(keyRef, {
          used: true,
          usedBy: context.usedBy,
          usedAt: now,
          enterpriseId: context.enterpriseId,
          companyId: context.enterpriseId,
          usedByDevice: context.deviceId || null,
          updatedAt: now,
        });
      });

      return { ok: true, keyId: keyDoc.id as string };
    } catch (error: any) {
      const reason = typeof error?.message === 'string' ? error.message : 'consume_failed';
      return { ok: false, reason: reason as 'invalid_key' | 'already_used' | 'expired_key' | 'revoked_key' | 'consume_failed' };
    }
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
    const tenantId =
      data.shops[0]?.companyId ||
      data.shops[0]?.enterpriseId ||
      data.staff[0]?.companyId ||
      data.staff[0]?.enterpriseId ||
      getLocalTenantId();
    
    data.shops.forEach(s => batch.set(doc(db, 'shops', s.id), withTenantMetadata('shops', s)));
    data.staff.forEach(s => batch.set(doc(db, 'staff', s.id), withTenantMetadata('staff', s)));
    data.products.forEach(p => batch.set(doc(db, 'products', p.id), withTenantMetadata('products', p)));
    data.tables.forEach(t => batch.set(doc(db, 'tables', t.id), withTenantMetadata('tables', t)));
    if (data.orders) {
      data.orders.forEach(o => batch.set(doc(db, 'orders', o.id), withTenantMetadata('orders', o)));
    }
    data.inventory.forEach(i => batch.set(doc(db, 'inventory', i.id), withTenantMetadata('inventory', i)));
    data.permissions.forEach(p => {
      const roleDocId = getRolePermissionDocId(p.role, tenantId);
      batch.set(
        doc(db, 'rolePermissions', roleDocId),
        withTenantMetadata('rolePermissions', {
          ...p,
          enterpriseId: p.enterpriseId || tenantId || undefined,
          companyId: (p as any).companyId || tenantId || undefined,
        }),
      );
    });
    data.printers.forEach(p => batch.set(doc(db, 'printers', p.id), withTenantMetadata('printers', p)));
    if (data.businessConfigs) {
      data.businessConfigs.forEach(c => batch.set(doc(db, 'businessConfigs', c.id), withTenantMetadata('businessConfigs', c)));
    }
    if (data.staffSchedules) {
      data.staffSchedules.forEach(s => batch.set(doc(db, 'staffSchedules', s.id), withTenantMetadata('staffSchedules', s)));
    }

    await batch.commit();
  }
};
