import React, { useEffect, useState } from 'react';
import { 
  Scale, 
  Wifi, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Settings2, 
  Monitor,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { scaleManager } from '../../scale/scaleManager';
import { ScaleConfig, ScaleReading, ScaleScanProgress } from '../../scale/scaleTypes';
import { labelManager, LabelHistoryEntry } from '../../label/labelManager';

export const MarketScales: React.FC = () => {
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [autoMessage, setAutoMessage] = useState('');
  const [connectedScale, setConnectedScale] = useState<ScaleConfig | null>(null);
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState<string>('');
  const [labelStatus, setLabelStatus] = useState<string>('');
  const [autoLabelEnabled, setAutoLabelEnabled] = useState(false);
  const [labelHistory, setLabelHistory] = useState<LabelHistoryEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('banana');

  const labelProducts = [
    { id: 'banana', name: 'Banana', pricePerKg: 5.99, prefix: '201' },
    { id: 'acougue_alcatra', name: 'Alcatra', pricePerKg: 39.9, prefix: '202' },
    { id: 'maca_fuji', name: 'Maca Fuji', pricePerKg: 9.9, prefix: '203' },
    { id: 'racao_premium', name: 'Racao Premium', pricePerKg: 12.5, prefix: '204' },
  ];

  useEffect(() => {
    const offProgress = scaleManager.onProgress((progress: ScaleScanProgress) => {
      setAutoMessage(progress.message);
    });
    const offReading = scaleManager.onReading((reading: ScaleReading) => {
      setLastReading(reading);
    });
    return () => {
      offProgress();
      offReading();
      scaleManager.stopReading();
    };
  }, []);

  useEffect(() => {
    labelManager.setAutoMode(autoLabelEnabled);
  }, [autoLabelEnabled]);

  useEffect(() => {
    setLabelHistory(labelManager.getHistory().slice(0, 6));
  }, []);

  const handleAutoConnectScale = async () => {
    setAutoConnecting(true);
    setAutoMessage('🔍 Procurando balança...');
    try {
      const result = await scaleManager.autoConnect();
      if (result.ok && result.config) {
        setConnectedScale(result.config);
        setAutoMessage('⚖️ Balança conectada!');
      } else {
        setAutoMessage('Nenhuma balança detectada. Você pode tentar novamente ou selecionar porta manualmente.');
      }
    } finally {
      setAutoConnecting(false);
    }
  };

  const handleCaptureWeight = () => {
    if (!lastReading) return;
    setCapturedWeight(lastReading.weight);
  };

  const refreshLabelHistory = () => {
    setLabelHistory(labelManager.getHistory().slice(0, 6));
  };

  const resolveActiveProduct = () => {
    return labelProducts.find((p) => p.id === selectedProductId) || labelProducts[0];
  };

  const resolveWeightForLabel = () => {
    if (capturedWeight !== null) return capturedWeight;
    if (lastReading) return lastReading.weight;
    const parsed = Number.parseFloat(manualWeight);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return null;
  };

  const handleGenerateLabel = async () => {
    const product = resolveActiveProduct();
    const weight = resolveWeightForLabel();
    if (!weight) {
      setLabelStatus('Sem balanca ativa. Digite o peso manual ou conecte uma balanca.');
      return;
    }

    const result = await labelManager.generateAndPrint({
      productId: product.id,
      productName: product.name,
      productPrefix: product.prefix,
      pricePerKg: product.pricePerKg,
      weightKg: weight,
    });
    setLabelStatus(result.message + ` | Codigo: ${result.label.barcode}`);
    refreshLabelHistory();
  };

  const handleReprint = async (id: string) => {
    const res = await labelManager.reprint(id);
    setLabelStatus(res.message);
  };

  useEffect(() => {
    if (!autoLabelEnabled || !lastReading) return;
    const product = resolveActiveProduct();
    labelManager.tryAutoLabel({
      productId: product.id,
      productName: product.name,
      productPrefix: product.prefix,
      pricePerKg: product.pricePerKg,
      weightKg: lastReading.weight,
    }).then((res) => {
      if (res.generated) {
        setLabelStatus(res.message + (res.label ? ` | Codigo: ${res.label.barcode}` : ''));
        refreshLabelHistory();
      }
    });
  }, [autoLabelEnabled, lastReading, selectedProductId]);

  const scales = [
    { id: 'SC-01', name: 'Balança Hortifruti 01', type: 'Toledo 2090', status: 'online', lastSync: '2 min', weight: '0.000 kg' },
    { id: 'SC-02', name: 'Balança Hortifruti 02', type: 'Toledo 2090', status: 'online', lastSync: '10 min', weight: '1.245 kg' },
    { id: 'SC-03', name: 'Balança Açougue 01', type: 'Filizola Platinum', status: 'warning', lastSync: '1h', weight: '---- kg' },
    { id: 'SC-04', name: 'Balança Padaria 01', type: 'Toledo Prix 5', status: 'online', lastSync: 'Active', weight: '0.000 kg' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Peripheral Mesh</h2>
           <p className="text-slate-500 font-medium font-sans">Sincronização de balanças, etiquetadoras e terminais ativos</p>
           {autoMessage && <p className="text-xs font-bold text-slate-500 mt-2">{autoMessage}</p>}
        </div>
        <div className="flex gap-4">
           <button className="px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-3">
              <RotateCcw className="w-4 h-4" /> Resetar Grid
           </button>
           <button
             onClick={handleAutoConnectScale}
             disabled={autoConnecting}
             className="px-10 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-200 disabled:opacity-60"
           >
              CONECTAR BALANÇA AUTOMATICAMENTE
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="space-y-8">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] ml-2 italic">Balanças de Pesagem</h3>
            {connectedScale && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Conectada automaticamente</p>
                  <span className="text-xs font-bold text-emerald-600">{connectedScale.type.toUpperCase()}</span>
                </div>
                <p className="text-xs font-bold text-emerald-700">{connectedScale.model}</p>
                <p className="text-2xl font-black text-emerald-700">
                  📊 {lastReading ? `${lastReading.weight.toFixed(3)} kg` : 'Aguardando leitura...'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCaptureWeight}
                    disabled={!lastReading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                  >
                    CAPTURAR PESO
                  </button>
                  {capturedWeight !== null && (
                    <span className="text-xs font-black text-emerald-700">Peso capturado: {capturedWeight.toFixed(3)} kg</span>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Geracao de Etiquetas</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                >
                  {labelProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {p.pricePerKg.toFixed(2)}/kg
                    </option>
                  ))}
                </select>
                <input
                  value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  placeholder="Peso manual (kg)"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGenerateLabel}
                  className="px-4 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  GERAR ETIQUETA
                </button>
                <button
                  onClick={() => setAutoLabelEnabled((v) => !v)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    autoLabelEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {autoLabelEnabled ? 'AUTO ETIQUETA ATIVADO' : 'ATIVAR AUTO ETIQUETA'}
                </button>
              </div>
              {labelStatus && <p className="text-xs font-bold text-slate-500">{labelStatus}</p>}
              {labelHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historico</p>
                  {labelHistory.slice(0, 4).map((h) => (
                    <div key={h.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{h.label.productName}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {h.peso.toFixed(3)}kg | R$ {h.preco.toFixed(2)} | {h.barcode}
                        </span>
                      </div>
                      <button
                        onClick={() => handleReprint(h.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600"
                      >
                        Reimprimir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {scales.map((scale, i) => (
              <motion.div 
                key={scale.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all"
              >
                 <div className="flex items-center gap-8">
                    <div className={cn(
                      "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all group-hover:rotate-6 shadow-xl",
                      scale.status === 'online' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/10' : 'bg-rose-50 text-rose-600 shadow-rose-500/10'
                    )}>
                       <Scale className="w-10 h-10" />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">{scale.name}</h4>
                       <div className="flex items-center gap-3 mt-1.5 opacity-60">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded italic">{scale.id}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{scale.type}</span>
                       </div>
                    </div>
                 </div>

                 <div className="text-right">
                    <div className="bg-slate-900 rounded-3xl p-5 mb-4 border border-white/5">
                       <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter italic">{scale.weight}</span>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest",
                         scale.status === 'online' ? 'text-emerald-500' : 'text-rose-500'
                       )}>
                          {scale.status.toUpperCase()}
                       </span>
                       <div className={cn("w-2 h-2 rounded-full", scale.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>

         <div className="space-y-10">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] ml-2 italic">Status do Hardware</h3>
            
            <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-12">
                     <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <Cpu className="w-8 h-8 text-emerald-400" />
                     </div>
                     <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Mesh Ativo</span>
                     </div>
                  </div>
                  
                  <h4 className="text-3xl font-black mb-4 uppercase tracking-tighter italic outline-text">Driver Central</h4>
                  <p className="text-slate-400 font-medium mb-10 italic">Gerenciando 12 dispositivos via P2P local.</p>
                  
                  <div className="space-y-6">
                     {[
                       { label: 'Uptime Sistema', val: '142h 12m', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                       { label: 'Latência Balanças', val: '15ms (Ótimo)', icon: <Zap className="w-4 h-4 text-amber-500" /> },
                       { label: 'Fila de Etiquetas', val: '00 Pendente', icon: <Settings2 className="w-4 h-4 text-blue-500" /> },
                     ].map((st, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                           <div className="flex items-center gap-4">
                              {st.icon}
                              <span className="text-xs font-black uppercase tracking-widest text-slate-400">{st.label}</span>
                           </div>
                           <span className="text-xs font-black uppercase tracking-tighter italic">{st.val}</span>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-700" />
            </div>

            <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-4 italic">
                    <AlertTriangle className="w-7 h-7 text-rose-500" /> Logs de Erro
                  </h3>
                  <button className="text-[10px] font-black uppercase text-indigo-600 hover:scale-105 transition-transform tracking-widest">Limpar</button>
               </div>
               <div className="space-y-6">
                  {[
                    { dev: 'SC-03', msg: 'Time-out na comunicação serial', time: '12:05' },
                    { dev: 'PR-02', msg: 'Papel de etiqueta esgotado', time: '11:42' },
                    { dev: 'POS-04', msg: 'Gaveta aberta forçadamente', time: '09:15' }
                  ].map((log, i) => (
                    <div key={i} className="flex items-start gap-5 p-6 rounded-3xl bg-slate-50 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200 group">
                       <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Monitor className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
                       </div>
                       <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                             <span className="text-xs font-black uppercase tracking-tighter group-hover:text-rose-600">{log.dev}</span>
                             <span className="text-[9px] font-bold text-slate-400">{log.time}</span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 italic leading-snug">{log.msg}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
