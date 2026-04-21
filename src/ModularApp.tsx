import { useState, useEffect } from 'react';
import { BusinessMode } from './core/types';
import { moduleManager } from './moduleManager';
import { ModeSelector } from './core/components/ModeSelector';
import { ConstructionLayout } from './modules/construction/views/ConstructionLayout';
import { RetailLayout } from './modules/retail/views/RetailLayout';
import { MarketLayout } from './modules/market/views/MarketLayout';
import { logger } from './core/services/logger';
import { accountService } from './core/services/accountService';
import { LoginView } from './core/views/LoginView';
import { DevDashboard } from './core/views/DevDashboard';
import { CentralServerView } from './core/views/CentralServerView';
import { serverEngine } from './services/serverEngine';
import { GlobalSettings } from './core/components/GlobalSettings';
import { ServiceLayout } from './modules/service/views/ServiceLayout';
import { ShieldAlert, Lock, Settings, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// We'll import the legacy App (Restaurant) for now to keep functionality
import LegacyApp from './App';

export default function ModularApp() {
  const [currentUser] = useState(accountService.getCurrentUser());
  const [mode, setMode] = useState<BusinessMode>(() => {
    return localStorage.getItem('pos_business_mode') as BusinessMode || null;
  });

  useEffect(() => {
    if (mode) {
      moduleManager.initialize(mode);
    }
  }, [mode]);

  // Auth Guard
  if (!currentUser) {
    return <LoginView />;
  }

  const deviceMode = localStorage.getItem('pos_device_mode');
  const isSystemPaused = currentUser ? accountService.getCompanyPauseStatus(currentUser.companyId) : false;

  useEffect(() => {
    if (deviceMode === 'central_server' && currentUser) {
      serverEngine.start(currentUser.companyId);
    }
  }, [deviceMode, currentUser]);

  if (deviceMode === 'central_server') {
    return <CentralServerView />;
  }

  const company = accountService.getCompanyById(currentUser.companyId);
  const isMaintenance = company?.status === 'maintenance';
  const lockedModules = company?.lockedModules || [];

  // Developer Role View
  if (currentUser.role === 'dev') {
    return <DevDashboard />;
  }

  const handleModeSelect = (selectedMode: BusinessMode) => {
    if (lockedModules.includes(selectedMode)) {
      alert('Este módulo foi temporariamente travado pelo administrador do sistema para manutenção ou configuração.');
      return;
    }
    setMode(selectedMode);
    localStorage.setItem('pos_business_mode', selectedMode);
    logger.log('system', `User selected business mode: ${selectedMode}`);
  };

  const renderMaintenanceOverlay = () => {
    if (!isMaintenance) return null;
    return (
      <div className="fixed bottom-6 right-6 z-[100] max-w-xs bg-amber-500 text-white p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-right-10 duration-500 border-4 border-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-2 rounded-xl">
             <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h5 className="font-black uppercase text-[10px] tracking-widest mb-1">Conta em Manutenção</h5>
            <p className="text-xs font-bold leading-relaxed opacity-90">
              O desenvolvedor está trabalhando em sua conta. Algumas funções podem sofrer alterações em breve.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemPauseOverlay = () => (
    <AnimatePresence>
      {isSystemPaused && (
         <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center"
         >
            <div className="bg-rose-500 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl shadow-rose-500/30">
               <ShieldAlert className="text-white w-16 h-16" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic uppercase">Sistema Pausado</h1>
            <p className="text-rose-200 text-xl font-medium max-w-lg leading-relaxed">
               Operações suspensas pelo administrador. Aguarde a liberação.
            </p>
            <div className="mt-12 p-8 bg-white/10 rounded-[2rem] border border-white/10 flex items-center gap-6">
               <Lock className="text-rose-400 w-8 h-8" />
               <p className="text-white font-black text-left">Protocolo de Emergência Ativo</p>
            </div>
         </motion.div>
      )}
    </AnimatePresence>
  );

  const renderModuleSwitcher = () => {
    if (!mode) return null;
    return (
      <motion.button 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setMode(null as any);
          localStorage.removeItem('pos_business_mode');
        }}
        className="fixed bottom-8 left-8 z-[100] bg-white/80 backdrop-blur-md text-slate-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 hover:bg-white transition-all font-bold text-xs uppercase tracking-tight border border-slate-200 group"
      >
        <LayoutGrid className="w-5 h-5 text-indigo-500 group-hover:rotate-90 transition-transform duration-500" />
        <span>Alternar Unidade / Módulo</span>
      </motion.button>
    );
  };

  if (!mode) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <GlobalSettings context="Painel Central" />
        {renderSystemPauseOverlay()}
        <div className={isSystemPaused ? 'pointer-events-none grayscale opacity-40 blur-sm transition-all duration-700' : 'transition-all duration-700'}>
          <ModeSelector onSelect={handleModeSelect} />
        </div>
        {renderMaintenanceOverlay()}
      </div>
    );
  }

  // Current Content
  let content = null;
  if (mode === 'restaurant' && !lockedModules.includes('restaurant')) {
    content = <LegacyApp />;
  } else if (mode === 'construction' && !lockedModules.includes('construction')) {
    content = <ConstructionLayout />;
  } else if (mode === 'retail' && !lockedModules.includes('retail')) {
    content = <RetailLayout />;
  } else if (mode === 'market' && !lockedModules.includes('market')) {
    content = <MarketLayout />;
  } else if (mode === 'service' && !lockedModules.includes('service')) {
    content = <ServiceLayout />;
  } else {
    content = <ModeSelector onSelect={handleModeSelect} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GlobalSettings context={mode === 'market' ? 'Mercado' : mode === 'retail' ? 'Varejo' : mode === 'restaurant' ? 'Restaurante' : mode === 'service' ? 'Serviços' : 'Obras'} />
      {renderSystemPauseOverlay()}
      
      <div className={isSystemPaused ? 'pointer-events-none grayscale opacity-40 blur-sm transition-all duration-700' : 'transition-all duration-700'}>
        {content}
        {renderModuleSwitcher()}
      </div>
      
      {renderMaintenanceOverlay()}
    </div>
  );
}
