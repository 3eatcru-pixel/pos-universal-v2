import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Terminal, 
  ArrowRight, 
  Mail, 
  Key, 
  LayoutGrid,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Server
} from 'lucide-react';
import { accountService } from '../services/accountService';
import { BusinessMode } from '../types';

export const LoginView: React.FC = () => {
  const enableDevOverride = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_OVERRIDE === 'true';
  const devOverrideCode = import.meta.env.VITE_DEV_OVERRIDE_CODE || '';
  const [tab, setTab] = useState<'employee' | 'dev' | 'server'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');

  // Secret Dev Trap
  const [secretClicks, setSecretClicks] = useState(0);
  const [showSecretLogin, setShowSecretLogin] = useState(false);
  const [secretCode, setSecretCode] = useState('');

  const handleSecretClick = () => {
    if (!enableDevOverride) return;
    const newCount = secretClicks + 1;
    if (newCount >= 7) {
      setShowSecretLogin(true);
      setSecretClicks(0);
    } else {
      setSecretClicks(newCount);
    }
  };

  const handleSecretLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enableDevOverride) {
      setError('Modo de override desabilitado neste ambiente.');
      setSecretCode('');
      return;
    }
    if (devOverrideCode && secretCode === devOverrideCode) {
      setLoading(true);
      const success = await accountService.loginAsMasterDev();
      if (success) {
        window.location.reload();
      } else {
        setError('Override de desenvolvimento indisponível.');
        setLoading(false);
      }
    } else {
      setError('Código de acesso mestre incorreto.');
      setSecretCode('');
    }
  };

  const handleJoinAsEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.joinAsEmployee(accessCode, employeeName);
    if (success) {
      window.location.reload();
    } else {
      setError('Código de acesso inválido ou empresa inativa.');
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.loginAsDev(email);
    if (success) {
      window.location.reload();
    } else {
      setError('Acesso negado. Apenas desenvolvedores autorizados.');
      setLoading(false);
    }
  };

  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await accountService.loginAsServer(accessCode);
    if (success) {
      window.location.reload();
    } else {
      setError('Falha na autenticação do servidor. Verifique o código da empresa.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10"
      >
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setTab('employee')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'employee' ? 'bg-slate-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-4 h-4" />
            Entrar no Sistema
          </button>
          <button 
            onClick={() => setTab('dev')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'dev' ? 'bg-slate-50 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Developer
          </button>
          <button 
            onClick={() => setTab('server')}
            className={`flex-1 py-8 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${tab === 'server' ? 'bg-slate-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Server className="w-4 h-4" />
            Servidor
          </button>
        </div>

        <div className="p-12 md:p-16">
          <AnimatePresence mode="wait">
            {tab === 'employee' && (
              <motion.div
                key="employee"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h1 className="text-3xl font-black text-slate-800 mb-2">Entrar no Terminal</h1>
                <p className="text-slate-500 mb-10 font-medium">Use o código de acesso fornecido pelo seu gerente.</p>
                
                <form onSubmit={handleJoinAsEmployee} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nome de Operação</label>
                    <div className="relative">
                      <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        required
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="Ex: João Silva" 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Código da Empresa</label>
                    <div className="relative">
                      <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        required
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="000 000" 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-[1.5rem] py-5 pl-14 pr-6 font-mono font-black text-xl tracking-[0.3em] outline-none transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'Validando...' : 'Entrar no Sistema'}
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        await accountService.loginAsDemo();
                      }}
                      className="w-full py-5 border-2 border-slate-100 text-slate-500 rounded-[1.5rem] font-bold text-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-3"
                    >
                       <LayoutGrid className="w-4 h-4" />
                       Experimentar em Modo Demo
                    </button>
                    <p className="text-[10px] text-center mt-6 font-black uppercase text-slate-300 tracking-widest">
                      Para criar uma conta oficial, contate o administrador
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {tab === 'dev' && (
              <motion.div
                key="dev"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button 
                  onClick={handleSecretClick}
                  className="bg-rose-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Terminal className="text-white w-8 h-8" />
                </button>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Painel Developer</h1>
                <p className="text-slate-500 mb-10 font-medium">Acesso restrito para monitoramento global e suporte técnico.</p>
                
                {(!showSecretLogin || !enableDevOverride) ? (
                  <form onSubmit={handleDevLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Email do Desenvolvedor</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="dev@pos.com" 
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 focus:bg-white rounded-[1.5rem] py-5 pl-14 pr-6 font-bold outline-none transition-all"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                      </div>
                    )}

                    <button 
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'Autenticando...' : 'Acessar Console Dev'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSecretLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 ml-4">MASTER OVERRIDE CODE REQUIRED</label>
                      <div className="relative">
                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400" />
                        <input 
                          required
                          type="password"
                          autoFocus
                          value={secretCode}
                          onChange={(e) => setSecretCode(e.target.value)}
                          placeholder="••••••••" 
                          className="w-full bg-rose-50 border-2 border-rose-200 focus:border-rose-500 rounded-[1.5rem] py-5 pl-14 pr-6 font-black text-xl tracking-[0.5em] outline-none transition-all"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                      </div>
                    )}

                    <button 
                      disabled={loading}
                      className="w-full bg-rose-600 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-rose-700 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'INITIALIZING...' : 'BYPASS FIREWALL'}
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setShowSecretLogin(false)}
                      className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600"
                    >
                      Voltar para Login Padrão
                    </button>
                  </form>
                )}
              </motion.div>
            )}
            {tab === 'server' && (
              <motion.div
                key="server"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Server className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Dedicated Server Node</h1>
                <p className="text-slate-500 mb-10 font-medium tracking-tight">Ative este dispositivo como o núcleo de processamento e backup da empresa.</p>
                
                <form onSubmit={handleServerLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Código Host da Empresa</label>
                    <div className="relative">
                      <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        required
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="000 000" 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] py-5 pl-14 pr-6 font-mono font-black text-xl tracking-[0.3em] outline-none transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'INITIALIZING KERNEL...' : 'Ativar Servidor Central'}
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        <span className="text-blue-500 font-black">NOTE:</span> Este modo desabilita funções de PDV neste terminal para priorizar o processamento de rede e integridade de dados.
                     </p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-3">
            <LayoutGrid className="w-4 h-4" />
            Modular POS Infrastructure v2.5
          </p>
        </div>
      </motion.div>
    </div>
  );
};
