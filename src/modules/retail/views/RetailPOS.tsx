import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Scan, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Zap,
  ArrowRight,
  User,
  Ticket,
  ChevronRight,
  LayoutGrid,
  List,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
}

export const RetailPOS: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [products, setProducts] = useState([
     { id: '1', name: 'Smartphone Z', price: 2499, category: 'Eletrônicos', active: true },
     { id: '2', name: 'Camiseta Air', price: 129, category: 'Vestuário', active: true },
     { id: '3', name: 'Tenis Runner', price: 450, category: 'Vestuário', active: true },
     { id: '4', name: 'Smartwatch V', price: 899, category: 'Eletrônicos', active: true },
     { id: '5', name: 'Mochila Tech', price: 289, category: 'Acessórios', active: true },
     { id: '6', name: 'Carregador Gan', price: 159, category: 'Eletrônicos', active: true },
  ]);
  
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleAddToCart = (product: any) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
      {/* Product Selection Area */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
         <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                 type="text" 
                 placeholder="Pesquisar produto ou bipar código..."
                 className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold outline-none transition-all"
               />
               <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scan className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
               <button 
                 onClick={() => setIsQuickStockOpen(true)}
                 className="p-3 rounded-xl transition-all text-rose-500 hover:bg-white hover:shadow-sm"
                 title="Gestão de Faltas (86)"
               >
                 <ShoppingCart className="w-5 h-5 line-through opacity-70" />
               </button>
               <button 
                 onClick={() => setViewMode('grid')}
                 className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
               >
                 <LayoutGrid className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
               >
                 <List className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-10">
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
               {products.filter(p => p.active).map((p) => (
                 <motion.button
                   whileTap={{ scale: 0.95 }}
                   key={p.id}
                   onClick={() => handleAddToCart(p)}
                   className="group bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-xl p-6 rounded-[2rem] text-left transition-all"
                 >
                    <div className="w-full aspect-square bg-white rounded-2xl mb-4 overflow-hidden p-4">
                       <img src={`https://picsum.photos/seed/${p.id}/200/200`} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mb-2 inline-block">
                       {p.category}
                    </span>
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight mb-1 group-hover:text-indigo-600">{p.name}</h4>
                    <p className="font-black text-slate-900">{formatCurrency(p.price)}</p>
                 </motion.button>
               ))}
            </div>
         </div>
      </div>

      {/* Cart & Checkout Area */}
      <div className="w-full lg:w-[480px] flex flex-col gap-8">
         <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Sacola de Compras</h3>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{cart.length} ITENS SELECIONADOS</p>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {cart.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="p-6 bg-slate-100 rounded-full mb-4">
                       <ShoppingCart className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">O carrinho está vazio</p>
                    <p className="text-xs font-medium text-slate-300 mt-2">Selecione produtos para começar.</p>
                 </div>
               ) : (
                 <AnimatePresence>
                   {cart.map((item) => (
                     <motion.div 
                       layout
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       key={item.id}
                       className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-between group"
                     >
                        <div className="flex items-center gap-4">
                           <button onClick={() => removeFromCart(item.id)} className="p-2 bg-white text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <div>
                              <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.name}</p>
                              <p className="text-[10px] font-black text-indigo-600">{formatCurrency(item.price)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="font-black text-slate-800 text-xs">{formatCurrency(item.price * item.quantity)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <button className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                                    <Minus className="w-3 h-3" />
                                 </button>
                                 <span className="font-black text-xs min-w-[20px] text-center">{item.quantity}</span>
                                 <button className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                                    <Plus className="w-3 h-3" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
               )}
            </div>

            <div className="p-10 border-t border-slate-50 bg-slate-50/50 space-y-6">
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest">
                     <span>Subtotal</span>
                     <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest">
                     <span>Impostos (5%)</span>
                     <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200" />
                  <div className="flex items-center justify-between">
                     <span className="text-lg font-black uppercase tracking-tight italic">Total Geral</span>
                     <span className="text-3xl font-black text-indigo-600 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                     <User className="w-4 h-4" /> Cliente
                  </button>
                  <button className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                     <Ticket className="w-4 h-4" /> Cupom
                  </button>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={() => {
                if(cart.length === 0) return alert('Carrinho vazio!');
                alert(`Pagamento Cartão de ${formatCurrency(total)} registrado com sucesso!`);
                setCart([]);
              }}
              className="p-6 bg-indigo-100 text-indigo-600 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm group">
               <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-widest">Cartão</span>
            </button>
            <button 
              onClick={() => {
                if(cart.length === 0) return alert('Carrinho vazio!');
                alert(`Pagamento Dinheiro de ${formatCurrency(total)} registrado com sucesso!`);
                setCart([]);
              }}
              className="p-6 bg-emerald-100 text-emerald-600 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group">
               <Banknote className="w-6 h-6 group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-widest">Dinheiro</span>
            </button>
            <button 
              onClick={() => {
                if(cart.length === 0) return alert('Carrinho vazio!');
                alert(`Pagamento PIX de ${formatCurrency(total)} registrado com sucesso!`);
                setCart([]);
              }}
              className="p-6 bg-slate-900 text-white rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl group">
               <Zap className="w-6 h-6 animate-pulse group-hover:scale-110" />
               <span className="text-[9px] font-black uppercase tracking-widest">PIX</span>
            </button>
         </div>
      </div>

      <AnimatePresence>
        {isQuickStockOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    Gestão de Faltas (Eletrônicos/Vestuário)
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Ative ou esgote itens da vitrine</p>
                </div>
                <button onClick={() => setIsQuickStockOpen(false)} className="p-3 bg-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-rose-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProducts(products.map(prod => prod.id === p.id ? { ...prod, active: !prod.active } : prod))}
                      className={cn(
                        "p-6 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col items-start gap-4 ring-offset-2",
                        p.active ? "bg-white border-slate-100 hover:border-indigo-200" : "bg-rose-50 border-rose-200 ring-2 ring-rose-500 shadow-lg shadow-rose-500/20"
                      )}
                    >
                       <div className="w-full flex items-start justify-between gap-4">
                         <div>
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block",
                             p.active ? "bg-slate-100 text-slate-500" : "bg-rose-500 text-white"
                           )}>
                             {p.category}
                           </span>
                           <h4 className={cn("font-black text-sm uppercase tracking-tight", p.active ? "text-slate-800" : "text-rose-900 line-through decoration-rose-500/50 decoration-2")}>{p.name}</h4>
                         </div>
                         <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2", p.active ? "bg-emerald-50 border-emerald-200 text-emerald-500" : "bg-rose-100 border-rose-300 text-rose-600")}>
                           <ShoppingCart className="w-5 h-5 line-through" />
                         </div>
                       </div>
                       <p className={cn("text-[10px] font-bold uppercase tracking-widest", p.active ? "text-emerald-600" : "text-rose-600")}>
                         {p.active ? 'Em Estoque' : 'Vitrine Esgotada'}
                       </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
