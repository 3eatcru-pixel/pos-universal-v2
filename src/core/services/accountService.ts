import { Company, Employee, SupportMessage, User, BusinessMode, UserRole } from '../types';
import { integrationLayer } from '../../integration/integrationLayer';
import { meshNetwork } from '../../services/p2pSync';

class AccountService {
  private companies: Company[] = JSON.parse(localStorage.getItem('pos_companies') || '[]');
  private currentUser: User | null = JSON.parse(localStorage.getItem('pos_current_user') || 'null');

  // Multi-company Isolation: The "Gold standard" for this POS
  public getCurrentCompanyId(): string | null {
    return this.currentUser?.companyId || null;
  }

  public async registerCompany(name: string, ownerEmail: string, businessType: BusinessMode, ownerName?: string, ownerPhone?: string, enabledModules?: string[]): Promise<Company> {
    const newCompany: any = {
      id: `comp-${Math.random().toString(36).substring(7)}`,
      name,
      ownerId: `usr-${Math.random().toString(36).substring(7)}`,
      businessType,
      ownerEmail,
      ownerName: ownerName || 'Proprietário',
      ownerPhone,
      accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'active',
      createdAt: Date.now(),
      enabledModules: enabledModules || [businessType]
    };

    this.companies.push(newCompany);
    this.saveCompanies();

    // Auto-login as owner
    this.loginAsOwner(newCompany);
    return newCompany;
  }

  public async loginAsOwner(company: Company) {
    const user: User = {
      id: `owner-${company.id}`,
      name: 'Proprietário',
      role: 'owner',
      email: company.ownerEmail,
      companyId: company.id
    };
    this.setCurrentUser(user);
    // Persist business mode for the module manager
    localStorage.setItem('pos_business_mode', company.businessType);
  }

  public async joinAsEmployee(accessCode: string, name: string): Promise<boolean> {
    const company = this.companies.find(c => c.accessCode === accessCode && (c.status === 'active' || c.status === 'maintenance'));
    if (!company) return false;

    const user: User = {
      id: `emp-${Math.random().toString(36).substring(7)}`,
      name,
      role: 'operator',
      companyId: company.id
    };

    this.setCurrentUser(user);
    localStorage.setItem('pos_business_mode', company.businessType);
    window.location.reload();
    return true;
  }

  public async loginAsDev(email: string): Promise<boolean> {
    // Basic dev check
    if (email.endsWith('@dev.com') || email === 'admin@pos.com') {
      const user: User = {
        id: 'dev-master',
        name: 'Developer Global',
        role: 'dev',
        email,
        companyId: 'global'
      };
      this.setCurrentUser(user);
      return true;
    }
    return false;
  }

  public async loginAsMasterDev(): Promise<boolean> {
    const user: User = {
      id: 'dev-master-bypass',
      name: 'System Architect',
      role: 'dev',
      email: 'architect@core.sys',
      companyId: 'global'
    };
    this.setCurrentUser(user);
    return true;
  }

  public async loginAsServer(accessCode: string): Promise<boolean> {
    const company = this.companies.find(c => c.accessCode === accessCode && c.status === 'active');
    if (!company) return false;

    const user: User = {
      id: `srv-${company.id}`,
      name: 'Central Processing Node',
      role: 'dev', // High privileges for the headless server
      companyId: company.id
    };

    localStorage.setItem('pos_device_role', 'host');
    localStorage.setItem('pos_device_mode', 'central_server');
    localStorage.setItem('pos_business_mode', company.businessType);
    this.setCurrentUser(user);
    window.location.reload();
    return true;
  }

  public logout() {
    this.currentUser = null;
    localStorage.removeItem('pos_current_user');
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    window.location.reload();
  }

  public async loginAsDemo() {
    // Look for existing demo or use first company as demo for this test environment
    const demoCompany = this.companies[0] || await this.registerCompany('Sistema Modular Demo', 'demo@modular.com', 'restaurant', 'Admin Demo', '11999999999');
    
    const user: User = {
      id: `demo-${demoCompany.id}`,
      name: 'Usuário Demo',
      role: 'owner',
      email: demoCompany.ownerEmail,
      companyId: demoCompany.id
    };
    
    this.setCurrentUser(user);
    // Do not force a mode so the user can choose in the selector
    localStorage.removeItem('pos_business_mode');
    window.location.reload();
  }

  private setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('pos_current_user', JSON.stringify(user));
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getAllCompanies(): Company[] {
    return this.companies;
  }

  public getCompanyById(id: string): Company | null {
    return this.companies.find(c => c.id === id) || null;
  }

  public async toggleMaintenance(companyId: string, enabled: boolean) {
    const company = this.companies.find(c => c.id === companyId);
    if (company) {
      company.status = enabled ? 'maintenance' : 'active';
      this.saveCompanies();
      
      if (enabled) {
        this.createDevNotification(companyId, 'Manutenção Iniciada', 'Sua conta está sob manutenção pelo desenvolvedor e será atualizada em breve.');
      }
    }
  }

  public async toggleModuleLock(companyId: string, moduleId: string, locked: boolean) {
    const company = this.companies.find(c => c.id === companyId);
    if (company) {
      const currentLocked = company.lockedModules || [];
      if (locked) {
        if (!currentLocked.includes(moduleId)) {
          company.lockedModules = [...currentLocked, moduleId];
        }
      } else {
        company.lockedModules = currentLocked.filter(m => m !== moduleId);
      }
      this.saveCompanies();
    }
  }

  public async setEnabledModules(companyId: string, modules: string[]) {
    const company = this.companies.find(c => c.id === companyId);
    if (company) {
      (company as any).enabledModules = modules;
      this.saveCompanies();
    }
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
      companyId
    };
    notifications.push(newNotif);
    localStorage.setItem('pos_notifications', JSON.stringify(notifications));
  }

  public getNotifications(companyId: string) {
    const all = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    return all.filter((n: any) => n.companyId === companyId);
  }

  public async loginAsManager(companyId: string) {
    const company = this.getCompanyById(companyId);
    if (!company) return;

    // Send maintenance notification to owner if a dev enters
    this.createDevNotification(companyId, 'Acesso Presencial Remoto', 'Um desenvolvedor acessou sua conta para verificações técnicas.');
    
    const user: User = {
      id: `dev-access-${company.id}`,
      name: `Dev (${company.ownerName})`,
      role: 'dev', // Keep as dev but scoped to company
      email: company.ownerEmail,
      companyId: company.id
    };
    this.setCurrentUser(user);
    localStorage.setItem('pos_business_mode', company.businessType);
    window.location.reload();
  }

  private saveCompanies() {
    localStorage.setItem('pos_companies', JSON.stringify(this.companies));
  }

  // Support
  public async sendSupportMessage(message: string) {
    if (!this.currentUser) return;
    const msg: SupportMessage = {
      id: `msg-${Date.now()}`,
      companyId: this.currentUser.companyId,
      message,
      timestamp: Date.now(),
      status: 'open'
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

    // Em um sistema real, o PIN seria validado no Firebase/Server
    if (pin !== '1234') return false; 

    const company = this.companies.find(c => c.id === companyId);
    if (company) {
      company.isPaused = !company.isPaused;
      this.saveCompanies();
      
      // Notificar rede
      meshNetwork.broadcast('system:pause_state', { 
        companyId, 
        isPaused: company.isPaused 
      });
      return true;
    }
    return false;
  }

  public async logoutCompany() {
    const user = this.getCurrentUser();
    // Apenas dono ou gerente pode desvincular a empresa do terminal
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) {
      throw new Error("Apenas o Dono ou Gerente pode desconectar a empresa deste terminal.");
    }

    localStorage.removeItem('pos_current_user');
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_sync_mode');
    window.location.reload();
  }

  public getCompanyPauseStatus(companyId: string): boolean {
    const company = this.getCompanyById(companyId);
    return company?.isPaused || false;
  }
}

export const accountService = new AccountService();
