import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, Search, Package, AlertTriangle, X, 
  ArrowUpRight, ArrowDownLeft, Edit2, Filter, 
  ChevronRight, RefreshCcw, Download, ArrowRightLeft,
  History, Boxes, Calendar, FileText, MapPin
} from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface Product {
  id: number;
  code?: string;
  name: string;
  stock: number;
  images?: string[];
  category?: { name: string };
  unit?: { symbol: string };
  isActive: boolean;
}

interface InventoryModuleProps {
  products: Product[];
  stockDetails: any[];
  movements: any[];
  onUpdateStock: (productId: number, newStock: number) => void;
  onEdit: (product: Product) => void;
  onOpenAssistant?: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  stockDetails,
  movements,
  onUpdateStock,
  onEdit,
  onOpenAssistant
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'history'>('stock');

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock <= 0).length,
  };

  const filteredStock = stockDetails.filter(s => 
    s.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.zone?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMovements = movements.filter(m => 
    m.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.observation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.lotNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      {/* Tab Switcher Interno */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button 
          onClick={() => setActiveSubTab('stock')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'stock' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Boxes className="w-4 h-4" />
          STOCK ACTUAL (DETALLADO)
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <History className="w-4 h-4" />
          HISTORIAL DE MOVIMIENTOS
        </button>
      </div>

      {activeSubTab === 'stock' ? (
        <>
          {/* Stock Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total SKU</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Bajo</p>
                <p className="text-3xl font-black text-amber-600">{stats.lowStock}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <X className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agotados</p>
                <p className="text-3xl font-black text-red-600">{stats.outOfStock}</p>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por producto o almacén..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={onOpenAssistant}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Asistente de Movimientos
                </button>
                <button className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all">
                  <Download className="w-4 h-4" />
                  Exportar Inventario
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Almacén / Zona</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Cantidad</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStock.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                            {s.product?.images?.[0] ? (
                              <img src={s.product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{s.product?.name}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.product?.code || 'SIN CODIGO'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">{s.warehouse?.name}</span>
                          {s.zone && (
                            <span className="text-[10px] text-slate-400 uppercase font-black mt-1 ml-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {s.zone.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black text-slate-900">
                            {formatNumber(s.quantity, 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{s.product?.unit?.symbol || 'un.'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                          {s.lotNumber || 'SIN LOTE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 italic">No hay stock registrado en ubicaciones</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Filtrar historial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <button 
              onClick={onOpenAssistant}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo Movimiento
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Tipo</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ruta / Almacén</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Cant.</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Glosa / Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{new Date(mov.createdAt).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        mov.type === 'INPUT' ? 'bg-emerald-100 text-emerald-700' :
                        mov.type === 'OUTPUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {mov.type === 'INPUT' ? 'INGRESO' : mov.type === 'OUTPUT' ? 'SALIDA' : 'TRANSFER.'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{mov.product?.name}</span>
                        <span className="text-[10px] text-slate-400 font-black italic">{mov.lotNumber ? `Lote: ${mov.lotNumber}` : 'Sin Lote'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {mov.fromWarehouse && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{mov.fromWarehouse.name}</span>
                              {mov.fromZone && <span className="text-[9px] text-slate-400 font-bold ml-1">📍 {mov.fromZone.name}</span>}
                            </div>
                          )}
                          {(mov.fromWarehouse && mov.toWarehouse) && <ArrowRightLeft className="w-3 h-3 text-slate-300" />}
                          {mov.toWarehouse && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black bg-blue-50 px-2 py-1 rounded-lg text-blue-600">{mov.toWarehouse.name}</span>
                              {mov.toZone && <span className="text-[9px] text-blue-400 font-bold ml-1">📍 {mov.toZone.name}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-800">{mov.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-slate-500 font-medium italic truncate max-w-xs">{mov.observation}</p>
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 italic">No hay movimientos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
