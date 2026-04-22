import React, { useState } from 'react';
import { 
  Building2, 
  BarChart3, 
  MessageSquare, 
  Users, 
  Calendar, 
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  Settings,
  Lock,
  Unlock,
  ShieldAlert,
  UserPlus,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../../lib/utils';
import { BusinessMode, Company } from '../types';

export const DevDashboard: React.FC = () => {
  const [companies, setCompanies] = useState(accountService.getAllCompanies());
  const messages = accountService.getSupportMessages();
  const [activeTab, setActiveTab] = useState<'companies' | 'support' | 'clients'>('companies');
  const [showAddCompany, setShowAddCompany] = useState(false);
  
  // New account form state
  const [newComp, setNewComp] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    type: 'generic' as BusinessMode,
    enabledModules: ['restaurant'] as string[]
  });

  const stats = [
    { label: 'Total de Empresas', value: companies.length, icon: Building2, color: 'text-blue-500' },
    { label: 'Donos Cadastrados', value: companies.length, icon: Users, color: 'text-emerald-500' },
    { label: 'Tickets Abertos', value: messages.filter(m => m.status === 'open').length, icon: MessageSquare, color: 'text-rose-500' },
  ];

  const handleLogout = () => {
    accountService.logout();
  };

  const refreshData = () => {
    setCompanies([...accountService.getAllCompanies()]);
  };

  const handleToggleMaintenance = async (companyId: string, enabled: boolean) => {
    await accountService.toggleMaintenance(companyId, enabled);
    refreshData();
  };

  const handleToggleLock = async (companyId: string, moduleId: string, locked: boolean) => {
    await accountService.toggleModuleLock(companyId, moduleId, locked);
    refreshData();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    await accountService.registerCompany(
      newComp.name, 
      newComp.ownerEmail, 
      newComp.type, 
      newComp.ownerName, 
      newComp.ownerPhone,
      newComp.enabledModules
    );
    setShowAddCompany(false);
    refreshData();
    setNewComp({ name: '', ownerName: '', ownerEmail: '', ownerPhone: '', type: 'generic', enabledModules: ['restaurant'] });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-[#0f172a] text-white p-6 sticky top-0 z-50 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-3 rounded-2xl shadow-lg shadow-rose-500/20 ring-1 ring-white/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Global infrastructure monitor</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Systems Online / Real-time sync</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowAddCompany(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/10"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Provision New Account
              </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-rose-500/20"
            >
              Terminate Session
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-10 space-y-12">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              key={stat.label}
              className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-default"
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0f172a] tracking-tighter">{stat.value}</span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
              <div className={`p-5 rounded-2xl bg-slate-50 ${stat.color} group-hover:bg-slate-100 transition-colors`}>
                <stat.icon className="w-7 h-7" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="flex bg-slate-50/50 p-2 border-b border-slate-100">
            {[
              { id: 'companies', label: 'Nodes Monitor', icon: Building2 },
              { id: 'clients', label: 'Master Accounts', icon: Users },
              { id: 'support', label: 'Support Queue', icon: MessageSquare }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-[#0f172a] shadow-md shadow-slate-200/50" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-500" : "text-slate-300")} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-10">
            {activeTab === 'companies' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Empresa / ID</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Modo / Status</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Módulos Habilitados</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Travas</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Código acesso</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 text-right">Controles Dev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {companies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-8 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-lg tracking-tight">{c.name}</span>
                            <span className="text-[10px] font-mono font-black text-slate-400">UUID: {c.id}</span>
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <div className="flex flex-col gap-2">
                            <span className="w-min bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-blue-100">
                              {c.businessType}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                c.status === 'active' ? 'bg-emerald-500' : c.status === 'maintenance' ? 'bg-amber-500' : 'bg-rose-500'
                              )} />
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{c.status}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {['restaurant', 'construction', 'retail', 'market', 'service'].map(mod => {
                              const isEnabled = (c.enabledModules || []).includes(mod);
                              return (
                                <button
                                  key={mod}
                                  onClick={() => {
                                    const current = c.enabledModules || [];
                                    const next = isEnabled ? current.filter(m => m !== mod) : [...current, mod];
                                    accountService.setEnabledModules(c.id, next);
                                    refreshData();
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded text-[8px] font-black uppercase border transition-all",
                                    isEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-300"
                                  )}
                                >
                                  {mod}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {['restaurant', 'construction', 'retail', 'market', 'service'].map(mod => {
                              const isLocked = (c.lockedModules || []).includes(mod);
                              const isEnabled = (c.enabledModules || []).includes(mod);
                              if (!isEnabled) return null;
                              return (
                                <button
                                  key={mod}
                                  onClick={() => handleToggleLock(c.id, mod, !isLocked)}
                                  className={cn(
                                    "p-1.5 rounded-lg border transition-all",
                                    isLocked ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                                  )}
                                  title={isLocked ? `Módulo ${mod} Travado` : `Travar Módulo ${mod}`}
                                >
                                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-8 px-4">
                          <span className="font-mono font-black text-slate-400 text-lg">#{c.accessCode}</span>
                        </td>
                        <td className="py-8 px-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleToggleMaintenance(c.id, c.status !== 'maintenance')}
                              className={cn(
                                "p-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2",
                                c.status === 'maintenance' ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600 hover:bg-amber-50 border border-slate-200"
                              )}
                            >
                              <ShieldAlert className="w-4 h-4" />
                              {c.status === 'maintenance' ? 'Em Manutenção' : 'Iniciar Manut.'}
                            </button>
                            <button 
                              onClick={() => accountService.loginAsManager(c.id)}
                              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all tracking-widest shadow-xl shadow-slate-200"
                            >
                              Acessar Painel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {companies.map(c => (
                   <div key={c.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 group hover:shadow-xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                           <Users className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight">{c.ownerName || 'Proprietário s/ Nome'}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável por: {c.name}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{c.ownerEmail}</span>
                        </div>
                        {c.ownerPhone && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{c.ownerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-slate-600">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">Empresa: {c.businessType}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                         <span className={cn(
                           "text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                           c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                         )}>Status Conta: {c.status}</span>
                         <button className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Bloquear Usuário</button>
                      </div>
                   </div>
                 ))}
                 {companies.length === 0 && (
                   <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                     Nenhum dono de empresa cadastrado
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                {messages.map(msg => (
                  <div key={msg.id} className="p-8 bg-slate-50 rounded-[2rem] flex items-start gap-6 group hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                      <MessageSquare className="w-6 h-6 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-800 uppercase tracking-tight text-sm">Empresa ID: {msg.companyId}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">{msg.message}</p>
                      <div className="mt-6 flex items-center gap-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${msg.status === 'open' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {msg.status}
                        </span>
                        <button className="text-xs font-black uppercase text-blue-600 hover:underline">Responder Cliente</button>
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                    Nenhum ticket de suporte aberto
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Account Generation Modal */}
      <AnimatePresence>
        {showAddCompany && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCompany(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Criar Nova Conta</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gerar infraestrutura para novo cliente</p>
                </div>
                <button 
                  onClick={() => setShowAddCompany(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome da Empresa</label>
                    <input 
                      required
                      value={newComp.name}
                      onChange={e => setNewComp({...newComp, name: e.target.value})}
                      placeholder="Ex: Mercado do João"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome do Dono</label>
                    <input 
                      required
                      value={newComp.ownerName}
                      onChange={e => setNewComp({...newComp, ownerName: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Telefone</label>
                    <input 
                      value={newComp.ownerPhone}
                      onChange={e => setNewComp({...newComp, ownerPhone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Email Principal</label>
                    <input 
                      required
                      type="email"
                      value={newComp.ownerEmail}
                      onChange={e => setNewComp({...newComp, ownerEmail: e.target.value})}
                      placeholder="joao@email.com"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Ativar Módulos Base</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {['restaurant', 'market', 'construction', 'retail', 'service'].map(mod => (
                        <label key={mod} className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox"
                             checked={newComp.enabledModules.includes(mod)}
                             onChange={(e) => {
                               const next = e.target.checked 
                                ? [...newComp.enabledModules, mod]
                                : newComp.enabledModules.filter(m => m !== mod);
                               setNewComp({ ...newComp, enabledModules: next });
                             }}
                             className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                           />
                           <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-slate-900">{mod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 mt-4"
                >
                  Gerar Conta e Código de Acesso
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
