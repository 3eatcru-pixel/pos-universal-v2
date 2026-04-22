import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  CreditCard, 
  Zap,
  ArrowUpRight,
  ShoppingBag,
  Star,
  Clock,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../../lib/utils';

export const RetailDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Varejo Intelligence</h2>
          <p className="text-slate-500 font-medium font-sans">Desempenho de vendas, fidelidade e gestão de estoque em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2">
              Relatório Semanal <ArrowUpRight className="w-4 h-4" />
           </button>
           <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
              Nova Venda (PDV)
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Vendas Hoje', value: formatCurrency(4250.80), change: '+12%', trend: 'up', icon: <TrendingUp />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Novos Clientes', value: '14', change: '+2', trend: 'up', icon: <Users />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Ticket Médio', value: formatCurrency(142.00), change: '-5%', trend: 'down', icon: <CreditCard />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Itens em Falta', value: '08', change: 'Crítico', trend: 'down', icon: <Package />, color: 'bg-rose-50 text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`p-4 rounded-2xl ${stat.color} w-fit mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md mb-1 flex items-center gap-0.5 ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
               <Zap className="w-6 h-6 text-indigo-600" /> Vendas Recentes
             </h3>
             <button className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">Ver Histórico</button>
          </div>
          
          <div className="space-y-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-50 hover:bg-white hover:border-indigo-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    #{4020 + i}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-tight">Cliente #{102 * i}</p>
                    <p className="text-[10px] font-bold text-slate-400">Há {5 * i} minutos • {3 + i} itens</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-800">{formatCurrency(89.90 * i)}</p>
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Pago</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="p-4 bg-white/10 w-fit rounded-2xl mb-6">
                   <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter italic">Clube Fidelidade</h3>
                <p className="text-slate-400 text-sm font-medium mb-8">2.4k Membros ativos ganhando pontos a cada compra.</p>
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800">
                           <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                   </div>
                   <span className="text-xs font-black uppercase text-slate-500 tracking-widest">+80 Hoje</span>
                </div>
             </div>
             <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20" />
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
             <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-emerald-500" /> Top Produtos
             </h3>
             <div className="space-y-6">
                {[
                  { name: 'Smartphone Pro Max', sales: '84', color: 'bg-blue-600' },
                  { name: 'Fone de Ouvido Noise', sales: '62', color: 'bg-emerald-600' },
                  { name: 'Carregador Ultra 65w', sales: '45', color: 'bg-indigo-600' },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                       <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.name}</span>
                       <span className="text-[10px] font-black text-slate-400">{item.sales} vds</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                       <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.sales}%` }} />
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
