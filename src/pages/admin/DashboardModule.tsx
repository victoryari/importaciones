import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Package, 
  AlertTriangle, 
  Star, 
  CheckCircle,
  PlusCircle,
  Settings as SettingsIcon
} from 'lucide-react';

interface DashboardModuleProps {
  stats: any;
  onNavigate: (view: string) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ stats, onNavigate }) => {
  return (
    <motion.div 
      key="dashboard" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }} 
      className="space-y-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-linear-to-br from-blue-600 to-blue-800 p-8 rounded-4xl text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <BarChart3 className="w-10 h-10 mb-4 opacity-50" />
          <p className="text-xs font-black uppercase tracking-widest text-blue-100 mb-1">Ventas Totales</p>
          <p className="text-4xl font-black">S/ {stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
        </div>
        
        <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm hover:shadow-xl transition-all">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos Realizados</p>
          <p className="text-3xl font-black text-slate-900">{stats?.totalOrders || 0}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Crecimiento constante
          </p>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm hover:shadow-xl transition-all">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos Pendientes</p>
          <p className="text-3xl font-black text-slate-900">{stats?.pendingOrders || 0}</p>
          <p className="text-[10px] text-amber-600 font-bold mt-2">Requieren tu atención inmediata</p>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm hover:shadow-xl transition-all">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Star className="w-6 h-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Ticket Promedio</p>
          <p className="text-3xl font-black text-slate-900">
            S/ {stats?.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            Productos Más Vendidos
          </h3>
          <div className="space-y-6">
            {stats?.topProducts?.map((prod: any, i: number) => (
              <div key={i} className="flex items-center gap-6 group">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">0{i+1}</div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 leading-tight">{prod.name}</p>
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((prod.quantity / (stats.topProducts[0]?.quantity || 1)) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{prod.quantity} <span className="text-[10px] text-slate-400 uppercase">un.</span></p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">S/ {prod.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {(!stats?.topProducts || stats.topProducts.length === 0) && (
              <div className="py-10 text-center text-slate-400 italic">No hay datos de ventas aún.</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-4xl text-white shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10"><BarChart3 className="w-40 h-40" /></div>
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">Acciones Rápidas</h3>
          <div className="space-y-4 relative z-10">
            <button onClick={() => onNavigate('orders')} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-all group">
              <span className="font-bold">Ver Pedidos Pendientes</span>
              <PlusCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => onNavigate('inventory')} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-all group">
              <span className="font-bold">Revisar Stock Bajo</span>
              <AlertTriangle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => onNavigate('settings')} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-all group">
              <span className="font-bold">Ajustes del Sitio</span>
              <SettingsIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="mt-12 p-6 bg-blue-600/20 rounded-3xl border border-blue-400/30">
            <p className="text-xs font-black uppercase tracking-widest text-blue-300 mb-2">Tip del Día</p>
            <p className="text-sm font-medium leading-relaxed italic">"Los productos agotados reducen la confianza. Revisa tu inventario diariamente."</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
