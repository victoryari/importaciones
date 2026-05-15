import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Package, Layers, Tag, Scale, PlusCircle, Search, 
  Edit2, Trash2, Eye, Filter, ChevronRight, LayoutGrid, 
  List, MoreVertical, Image as ImageIcon, Globe, Calendar, Power, Lock
} from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  _count?: { products: number };
}

interface Brand {
  id: number;
  name: string;
  logo?: string;
  _count?: { products: number };
}

interface Unit {
  id: number;
  name: string;
  symbol: string;
}

interface Product {
  id: number;
  code?: string;
  name: string;
  salePrice: number;
  stock: number;
  images?: string[];
  category?: { name: string };
  brand?: { name: string };
  unit?: { symbol: string };
  isActive: boolean;
  showInWeb: boolean;
  manageLots: boolean;
  useExpiryDate: boolean;
}

interface ProductModuleProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  onDelete: (type: string, id: number) => void;
  onEdit: (type: string, item: any) => void;
  onNew: (type: string) => void;
}

export const ProductModule: React.FC<ProductModuleProps> = ({
  products,
  categories,
  brands,
  units,
  onDelete,
  onEdit,
  onNew
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_PRODUCTS') || hasPermission?.('ALL');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands' | 'units'>('products');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'products', label: 'Productos', icon: Package, count: products.length },
    { id: 'categories', label: 'Categorías', icon: Layers, count: categories.length },
    { id: 'brands', label: 'Marcas', icon: Tag, count: brands.length },
    { id: 'units', label: 'Unidades', icon: Scale, count: units.length },
  ];

  const getFilteredItems = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'products': return products.filter(p => p.name.toLowerCase().includes(term) || p.code?.toLowerCase().includes(term));
      case 'categories': return categories.filter(c => c.name.toLowerCase().includes(term));
      case 'brands': return brands.filter(b => b.name.toLowerCase().includes(term));
      case 'units': return units.filter(u => u.name.toLowerCase().includes(term) || u.symbol.toLowerCase().includes(term));
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-slate-100/50 p-1.5 rounded-4xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                isActive 
                  ? 'bg-white text-blue-900 shadow-sm scale-105' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Buscar ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        {canWrite ? (
          <button 
            onClick={() => onNew(activeTab)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
          >
            <PlusCircle className="w-5 h-5" />
            Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : 'Unidad'}
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-400 px-8 py-3 rounded-2xl font-bold cursor-not-allowed">
            <Lock className="w-5 h-5" />
            Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : 'Unidad'}
          </div>
        )}
      </div>

      {/* Content Area */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                {activeTab === 'products' ? (
                  <>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Categoría / Marca</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Precio</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Nombre</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Relacionados</th>
                  </>
                )}
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {getFilteredItems().map((item: any) => (
                <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${!item.isActive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {activeTab === 'products' && (
                        <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      )}
                        <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        {item.code && <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{item.code}</span>}
                        {activeTab === 'units' && <span className="text-xs text-blue-600 font-bold">{item.symbol}</span>}
                        
                        {activeTab === 'products' && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {item.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                            {item.showInWeb && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                <Globe className="w-2 h-2" /> Web
                              </span>
                            )}
                            {item.manageLots && (
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                <Package className="w-2 h-2" /> Lote
                              </span>
                            )}
                            {item.useExpiryDate && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                <Calendar className="w-2 h-2" /> Venc.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {activeTab === 'products' ? (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">{item.category?.name || 'S/C'}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">{item.brand?.name || 'S/M'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const totalStock = (item.stockRecords || []).reduce((acc: number, s: any) => {
                            if (s.warehouseId === 6 || s.warehouse?.type?.toUpperCase() === 'TRANSITORIO') return acc;
                            return acc + s.quantity;
                          }, 0);
                          return (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                              totalStock <= 0 ? 'bg-red-50 text-red-600 border-red-100' :
                              totalStock <= 10 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              {totalStock} {item.unit?.symbol || 'un.'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-slate-900 text-lg">S/ {formatNumber(item.salePrice)}</span>
                          <div className="flex items-center gap-2 text-[9px] font-bold">
                            <span className="text-slate-400">Costo: S/ {formatNumber(item.costPrice || 0)}</span>
                            <span className="text-blue-500">({item.profitMargin || 0}%)</span>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">
                        {item._count?.products || 0} Productos
                      </span>
                    </td>
                  )}

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(activeTab, item)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(activeTab, item.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
