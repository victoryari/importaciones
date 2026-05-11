import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, Search, Package, AlertTriangle, X, 
  ArrowUpRight, ArrowDownLeft, Edit2, Filter, 
  ChevronRight, RefreshCcw, Download
} from 'lucide-react';

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
  onUpdateStock: (productId: number, newStock: number) => void;
  onEdit: (product: Product) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  onUpdateStock,
  onEdit
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock <= 0).length,
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
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
              placeholder="Buscar por nombre o código de barra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
            />
          </div>
          <button className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all">
            <Download className="w-4 h-4" />
            Exportar Inventario
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ubicación / Cat.</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Cantidad</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className={`hover:bg-slate-50/80 transition-colors group ${!prod.isActive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {prod.images?.[0] ? (
                          <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{prod.name}</span>
                          {!prod.isActive && (
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Descontinuado</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{prod.code || 'SIN CODIGO'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">{prod.category?.name || 'Almacén Principal'}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Pasillo A - Estante 2</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-xl font-black ${
                        prod.stock <= 0 ? 'text-red-600' :
                        prod.stock <= 10 ? 'text-amber-600' : 'text-slate-900'
                      }`}>
                        {prod.stock}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{prod.unit?.symbol || 'un.'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        const newStock = prompt(`Actualizar stock de "${prod.name}":`, prod.stock.toString());
                        if (newStock !== null) onUpdateStock(prod.id, parseInt(newStock));
                      }}
                      className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
