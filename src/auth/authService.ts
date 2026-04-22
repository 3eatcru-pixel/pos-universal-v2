import type {
  AuthRole,
  AuthSession,
  AuthState,
  AuthTenant,
  AuthUser,
  CreateOwnerTenantInput,
  CreateOwnerUserInput,
  CreateStaffInput,
} from './authTypes';
import { requirePermission, canAccessTenant } from './accessControl';
import { sessionManager } from './sessionManager';

const AUTH_STATE_KEY = 'pos_auth_state_v1';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

class AuthService {
  private state: AuthState = this.loadState();

  constructor() {
    this.ensureDevBootstrap();
  }

  private loadState(): AuthState {
    try {
      const raw = localStorage.getItem(AUTH_STATE_KEY);
      if (!raw) return { tenants: [], users: [] };
      const parsed = JSON.parse(raw) as AuthState;
      return {
        tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
      };
    } catch {
      return { tenants: [], users: [] };
    }
  }

  private saveState(): void {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(this.state));
  }

  private ensureDevBootstrap(): void {
    const devExists = this.state.users.some((u) => u.role === 'dev');
    if (devExists) return;

    const now = Date.now();
    this.state.users.push({
      id: 'dev_master',
      tenantId: null,
      role: 'dev',
      name: 'Developer Global',
      email: 'admin@pos.com',
      password: 'dev123',
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    this.saveState();
  }

  private startSession(user: AuthUser): AuthSession {
    const session: AuthSession = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    sessionManager.setSession(session, user);
    return session;
  }

  getCurrentSession(): AuthSession | null {
    return sessionManager.touchSession() || sessionManager.getSession();
  }

  getCurrentUser(): AuthUser | null {
    const session = sessionManager.getSession();
    if (!session) return null;
    return this.state.users.find((u) => u.id === session.userId) || null;
  }

  getCurrentTenant(): AuthTenant | null {
    const session = sessionManager.getSession();
    if (!session?.tenantId) return null;
    return this.state.tenants.find((t) => t.id === session.tenantId) || null;
  }

  logout(): void {
    sessionManager.clearSession();
  }

  loginAsDev(email: string, password?: string): boolean {
    const normalized = email.trim().toLowerCase();
    const user =
      this.state.users.find((u) => u.role === 'dev' && (u.email || '').toLowerCase() === normalized) ||
      this.state.users.find((u) => u.role === 'dev' && normalized.endsWith('@dev.com'));

    if (!user) return false;
    if (user.password && password && user.password !== password) return false;
    this.startSession(user);
    return true;
  }

  loginWithCredentials(email: string, password: string, tenantId?: string): boolean {
    const normalized = email.trim().toLowerCase();
    const user = this.state.users.find((u) => {
      if ((u.email || '').toLowerCase() !== normalized) return false;
      if (!u.active) return false;
      if (tenantId && u.tenantId !== tenantId) return false;
      return true;
    });

    if (!user) return false;
    if ((user.password || '') !== password) return false;
    this.startSession(user);
    return true;
  }

  loginWithPIN(pin: string, tenantId: string): boolean {
    const sanitized = pin.replace(/\D/g, '');
    const user = this.state.users.find((u) => {
      if (!u.active) return false;
      if (u.tenantId !== tenantId) return false;
      if (!u.pin) return false;
      return u.pin === sanitized;
    });
    if (!user) return false;
    this.startSession(user);
    return true;
  }

  createOwner(tenantData: CreateOwnerTenantInput, ownerData: CreateOwnerUserInput): { tenant: AuthTenant; owner: AuthUser } {
    requirePermission('tenant.create_owner');

    const now = Date.now();
    const tenantId = generateId('tenant');
    const ownerId = generateId('owner');

    const tenant: AuthTenant = {
      id: tenantId,
      name: tenantData.name,
      businessType: tenantData.businessType,
      ownerId,
      ownerEmail: tenantData.ownerEmail,
      ownerName: tenantData.ownerName,
      ownerPhone: tenantData.ownerPhone,
      accessCode: generateAccessCode(),
      status: 'active',
      createdAt: now,
      enabledModules: tenantData.enabledModules || [tenantData.businessType],
      lockedModules: [],
      isPaused: false,
    };

    const owner: AuthUser = {
      id: ownerId,
      tenantId,
      role: 'owner',
      name: tenantData.ownerName,
      email: tenantData.ownerEmail,
      password: ownerData.password,
      pin: ownerData.pin?.replace(/\D/g, ''),
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.state.tenants.push(tenant);
    this.state.users.push(owner);
    this.saveState();
    return { tenant, owner };
  }

  createStaff(input: CreateStaffInput): AuthUser {
    const session = requirePermission('staff.create');
    if (session.role !== 'dev' && session.tenantId !== input.tenantId) {
      throw new Error('tenant_forbidden');
    }

    const now = Date.now();
    const user: AuthUser = {
      id: generateId('staff'),
      tenantId: input.tenantId,
      role: input.role,
      name: input.name,
      email: input.email?.toLowerCase(),
      password: input.password,
      pin: input.pin?.replace(/\D/g, ''),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.state.users.push(user);
    this.saveState();
    return user;
  }

  updateStaff(userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email' | 'pin' | 'password' | 'active'>>): AuthUser {
    requirePermission('staff.update');
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('staff_not_found');
    }
    if (user.role === 'dev' || user.role === 'owner') {
      throw new Error('staff_update_forbidden');
    }

    user.name = patch.name ?? user.name;
    user.email = patch.email?.toLowerCase() ?? user.email;
    user.pin = patch.pin ? patch.pin.replace(/\D/g, '') : user.pin;
    user.password = patch.password ?? user.password;
    user.active = patch.active ?? user.active;
    user.updatedAt = Date.now();
    this.saveState();
    return user;
  }

  assignRole(userId: string, role: Exclude<AuthRole, 'dev' | 'owner'>): AuthUser {
    requirePermission('staff.assign_role');
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('staff_not_found');
    }
    if (user.role === 'dev' || user.role === 'owner') {
      throw new Error('role_assignment_forbidden');
    }
    user.role = role;
    user.updatedAt = Date.now();
    this.saveState();
    return user;
  }

  listTenants(): AuthTenant[] {
    return [...this.state.tenants];
  }

  getTenantById(tenantId: string): AuthTenant | null {
    return this.state.tenants.find((t) => t.id === tenantId) || null;
  }

  getUsersByTenant(tenantId: string): AuthUser[] {
    return this.state.users.filter((u) => u.tenantId === tenantId);
  }

  updateTenant(tenantId: string, patch: Partial<AuthTenant>): AuthTenant {
    const session = requirePermission('tenant.manage_modules');
    if (session.role !== 'dev' && !canAccessTenant(tenantId)) {
      throw new Error('tenant_forbidden');
    }
    const tenant = this.state.tenants.find((t) => t.id === tenantId);
    if (!tenant) {
      throw new Error('tenant_not_found');
    }
    Object.assign(tenant, patch);
    this.saveState();
    return tenant;
  }

  migrateRestaurantUsers(tenantId: string, legacyStaff: Array<{ id: string; name: string; role?: string; pin?: string; email?: string }>): number {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return 0;

    let migrated = 0;
    const now = Date.now();
    for (const legacy of legacyStaff) {
      const exists = this.state.users.some((u) => u.id === legacy.id || (!!legacy.email && u.email === legacy.email.toLowerCase()));
      if (exists) continue;

      const mappedRole: AuthRole = legacy.role === 'owner' ? 'owner' : legacy.role?.includes('manager') ? 'manager' : 'staff';
      this.state.users.push({
        id: legacy.id || generateId('staff'),
        tenantId,
        role: mappedRole,
        name: legacy.name || 'Staff',
        email: legacy.email?.toLowerCase(),
        pin: legacy.pin?.replace(/\D/g, ''),
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      migrated += 1;
    }

    if (migrated > 0) {
      this.saveState();
    }
    return migrated;
  }
}

export const authService = new AuthService();

