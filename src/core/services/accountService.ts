import { Company, SupportMessage, User, BusinessMode } from '../types';
import { meshNetwork } from '../../services/p2pSync';
import { authService } from '../../auth/authService';

class AccountService {
  private mapRoleForLegacy(role: string): User['role'] {
    if (role === 'staff') return 'staff';
    if (role === 'manager') return 'manager';
    if (role === 'owner') return 'owner';
    if (role === 'dev') return 'dev';
    return 'staff';
  }

  private toLegacyUser(): User | null {
    const authUser = authService.getCurrentUser();
    const tenant = authService.getCurrentTenant();
    if (!authUser) return null;

    return {
      id: authUser.id,
      name: authUser.name,
      role: this.mapRoleForLegacy(authUser.role),
      email: authUser.email,
      pin: authUser.pin,
      companyId: authUser.tenantId || tenant?.id || 'global',
    };
  }

  public getCurrentCompanyId(): string | null {
    return authService.getCurrentTenant()?.id || null;
  }

  public getCurrentTenant() {
    return authService.getCurrentTenant();
  }

  public async registerCompany(
    name: string,
    ownerEmail: string,
    businessType: BusinessMode,
    ownerName?: string,
    ownerPhone?: string,
    enabledModules?: string[]
  ): Promise<Company> {
    const ownerPassword = Math.random().toString(36).slice(2, 10);
    const ownerPin = Math.floor(1000 + Math.random() * 9000).toString();

    const created = authService.createOwner(
      {
        name,
        businessType,
        ownerEmail,
        ownerName: ownerName || 'Proprietário',
        ownerPhone,
        enabledModules: enabledModules || [businessType],
      },
      {
        password: ownerPassword,
        pin: ownerPin,
      }
    );

    return {
      id: created.tenant.id,
      name: created.tenant.name,
      ownerId: created.tenant.ownerId,
      businessType: created.tenant.businessType,
      ownerEmail: created.tenant.ownerEmail,
      ownerName: created.tenant.ownerName,
      ownerPhone: created.tenant.ownerPhone,
      accessCode: created.tenant.accessCode,
      status: created.tenant.status,
      createdAt: created.tenant.createdAt,
      enabledModules: created.tenant.enabledModules,
      lockedModules: created.tenant.lockedModules,
      isPaused: created.tenant.isPaused,
      owners: [created.owner.id],
    };
  }

  public async createOwner(
    tenantData: {
      name: string;
      businessType: BusinessMode;
      ownerEmail: string;
      ownerName: string;
      ownerPhone?: string;
      enabledModules?: string[];
    },
    ownerData: { password: string; pin?: string }
  ) {
    return authService.createOwner(tenantData, ownerData);
  }

  public async loginWithCredentials(email: string, password: string, tenantId?: string): Promise<boolean> {
    return authService.loginWithCredentials(email, password, tenantId);
  }

  public async loginWithPIN(pin: string, tenantId: string): Promise<boolean> {
    return authService.loginWithPIN(pin, tenantId);
  }

  public async createStaff(input: {
    tenantId: string;
    name: string;
    email?: string;
    password?: string;
    pin?: string;
    role: 'manager' | 'staff';
  }) {
    return authService.createStaff(input);
  }

  public async updateStaff(
    userId: string,
    patch: Partial<{ name: string; email: string; pin: string; password: string; active: boolean }>
  ) {
    return authService.updateStaff(userId, patch);
  }

  public async assignRole(userId: string, role: 'manager' | 'staff') {
    return authService.assignRole(userId, role);
  }

  public async loginAsOwner(company: Company): Promise<boolean> {
    const users = authService.getUsersByTenant(company.id);
    const owner = users.find((u) => u.role === 'owner' && (u.email || '').toLowerCase() === company.ownerEmail.toLowerCase());
    if (!owner || !owner.password || !owner.email) return false;
    return authService.loginWithCredentials(owner.email, owner.password, company.id);
  }

  public async joinAsEmployee(accessCode: string, name: string): Promise<boolean> {
    const tenant = authService.listTenants().find((t) => t.accessCode === accessCode && (t.status === 'active' || t.status === 'maintenance'));
    if (!tenant) return false;

    const tempPin = Math.floor(1000 + Math.random() * 9000).toString();
    const created = authService.createStaff({
      tenantId: tenant.id,
      name,
      pin: tempPin,
      role: 'staff',
    });
    return authService.loginWithPIN(created.pin || tempPin, tenant.id);
  }

  public async loginAsDev(email: string, password?: string): Promise<boolean> {
    return authService.loginAsDev(email, password);
  }

  public async loginAsMasterDev(): Promise<boolean> {
    return authService.loginAsDev('admin@pos.com', 'dev123');
  }

  public async loginAsServer(accessCode: string): Promise<boolean> {
    const tenant = authService.listTenants().find((t) => t.accessCode === accessCode && t.status === 'active');
    if (!tenant) return false;

    const success = authService.loginAsDev('admin@pos.com', 'dev123');
    if (!success) return false;

    localStorage.setItem('pos_device_role', 'host');
    localStorage.setItem('pos_device_mode', 'central_server');
    localStorage.setItem('pos_business_mode', tenant.businessType);
    localStorage.setItem('rm_enterprise_id', tenant.id);
    return true;
  }

  public logout() {
    authService.logout();
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    window.location.reload();
  }

  public async loginAsDemo() {
    const tenants = authService.listTenants();
    let tenant = tenants[0];

    if (!tenant) {
      const created = authService.createOwner(
        {
          name: 'Sistema Modular Demo',
          ownerEmail: 'demo@modular.com',
          businessType: 'restaurant',
          ownerName: 'Admin Demo',
          ownerPhone: '11999999999',
          enabledModules: ['restaurant', 'retail', 'market', 'service'],
        },
        {
          password: 'demo123',
          pin: '1234',
        }
      );
      tenant = created.tenant;
    }

    const owner = authService.getUsersByTenant(tenant.id).find((u) => u.role === 'owner');
    if (!owner || !owner.email || !owner.password) {
      return;
    }

    authService.loginWithCredentials(owner.email, owner.password, tenant.id);
    localStorage.removeItem('pos_business_mode');
    window.location.reload();
  }

  public getCurrentUser(): User | null {
    return this.toLegacyUser();
  }

  public getAllCompanies(): Company[] {
    return authService.listTenants().map((t) => ({
      id: t.id,
      name: t.name,
      ownerId: t.ownerId,
      businessType: t.businessType,
      ownerEmail: t.ownerEmail,
      ownerName: t.ownerName,
      ownerPhone: t.ownerPhone,
      accessCode: t.accessCode,
      status: t.status,
      createdAt: t.createdAt,
      lockedModules: t.lockedModules,
      enabledModules: t.enabledModules,
      isPaused: t.isPaused,
      owners: [t.ownerId],
    }));
  }

  public getCompanyById(id: string): Company | null {
    const tenant = authService.getTenantById(id);
    if (!tenant) return null;
    return {
      id: tenant.id,
      name: tenant.name,
      ownerId: tenant.ownerId,
      businessType: tenant.businessType,
      ownerEmail: tenant.ownerEmail,
      ownerName: tenant.ownerName,
      ownerPhone: tenant.ownerPhone,
      accessCode: tenant.accessCode,
      status: tenant.status,
      createdAt: tenant.createdAt,
      lockedModules: tenant.lockedModules,
      enabledModules: tenant.enabledModules,
      isPaused: tenant.isPaused,
      owners: [tenant.ownerId],
    };
  }

  public async toggleMaintenance(companyId: string, enabled: boolean) {
    authService.updateTenant(companyId, { status: enabled ? 'maintenance' : 'active' });
    if (enabled) {
      this.createDevNotification(
        companyId,
        'Manutenção Iniciada',
        'Sua conta está sob manutenção pelo desenvolvedor e será atualizada em breve.'
      );
    }
  }

  public async toggleModuleLock(companyId: string, moduleId: string, locked: boolean) {
    const company = this.getCompanyById(companyId);
    if (!company) return;
    const currentLocked = company.lockedModules || [];
    const nextLocked = locked
      ? Array.from(new Set([...currentLocked, moduleId]))
      : currentLocked.filter((m) => m !== moduleId);
    authService.updateTenant(companyId, { lockedModules: nextLocked });
  }

  public async setEnabledModules(companyId: string, modules: string[]) {
    authService.updateTenant(companyId, { enabledModules: modules });
  }

  private createDevNotification(companyId: string, title: string, message: string) {
    const notifications = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      type: 'maintenance',
      companyId,
    };
    notifications.push(newNotif);
    localStorage.setItem('pos_notifications', JSON.stringify(notifications));
  }

  public getNotifications(companyId: string) {
    const all = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    return all.filter((n: any) => n.companyId === companyId);
  }

  public async loginAsManager(companyId: string) {
    const manager = authService.getUsersByTenant(companyId).find((u) => u.role === 'manager');
    if (!manager) {
      throw new Error('Nenhum gerente cadastrado para esta empresa.');
    }
    const ok = authService.loginWithPIN(manager.pin || '0000', companyId);
    if (!ok) {
      throw new Error('Falha ao abrir sessão de gerente.');
    }
    localStorage.setItem('pos_business_mode', authService.getTenantById(companyId)?.businessType || 'restaurant');
    window.location.reload();
  }

  public async sendSupportMessage(message: string) {
    const user = this.getCurrentUser();
    if (!user) return;
    const msg: SupportMessage = {
      id: `msg-${Date.now()}`,
      companyId: user.companyId,
      message,
      timestamp: Date.now(),
      status: 'open',
    };
    const messages = JSON.parse(localStorage.getItem('pos_support_messages') || '[]');
    messages.push(msg);
    localStorage.setItem('pos_support_messages', JSON.stringify(messages));
  }

  public getSupportMessages(): SupportMessage[] {
    return JSON.parse(localStorage.getItem('pos_support_messages') || '[]');
  }

  public async pauseSystem(companyId: string, pin: string): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) return false;
    if (pin !== '1234') return false;

    const company = this.getCompanyById(companyId);
    if (!company) return false;

    const nextPaused = !Boolean(company.isPaused);
    authService.updateTenant(companyId, { isPaused: nextPaused });
    meshNetwork.broadcast('system:pause_state', { companyId, isPaused: nextPaused });
    return true;
  }

  public async logoutCompany() {
    const user = this.getCurrentUser();
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) {
      throw new Error('Apenas o Dono ou Gerente pode desconectar a empresa deste terminal.');
    }

    authService.logout();
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_sync_mode');
    window.location.reload();
  }

  public getCompanyPauseStatus(companyId: string): boolean {
    const company = this.getCompanyById(companyId);
    return Boolean(company?.isPaused);
  }

  public migrateRestaurantUsers(
    tenantId: string,
    legacyStaff: Array<{ id: string; name: string; role?: string; pin?: string; email?: string }>
  ): number {
    return authService.migrateRestaurantUsers(tenantId, legacyStaff);
  }
}

export const accountService = new AccountService();
