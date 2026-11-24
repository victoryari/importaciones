import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Package, Layers, Tag, Scale, PlusCircle, Search, 
  Edit2, Trash2, Eye, Filter, ChevronRight, LayoutGrid, 
  List, MoreVertical, Image as ImageIcon, Globe, Calendar, Power, Lock, Sparkles, Box,
  GitBranch, Palette
} from 'lucide-react';
import { formatNumber, calculateTotalUnitsPerPackage } from '../../lib/utils';
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
  sunatCode?: string;
  equivalence?: number;
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
  line?: { name: string };
  color?: { name: string; hexCode?: string };
  unit?: { name?: string; symbol?: string };
  package?: { name?: string; symbol?: string };
  subPackage?: { name?: string; symbol?: string };
  quantityPerPackage?: number;
  quantityPerSubPackage?: number;
  isActive: boolean;
  showInWeb: boolean;
  manageLots: boolean;
  useExpiryDate: boolean;
  isOnSale?: boolean;
  discountPercent?: number;
  weight?: number;
  volume?: number;
  brandCertificate?: string;
}

interface ProductModuleProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  lines: any[];
  colors: any[];
  units: Unit[];
  onDelete: (type: string, id: number) => void;
  onEdit: (type: string, item: any) => void;
  onNew: (type: string) => void;
}

export const ProductModule: React.FC<ProductModuleProps> = ({
  products,
  categories,
  brands,
  lines,
  colors,
  units,
  onDelete,
  onEdit,
  onNew
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_PRODUCTS') || hasPermission?.('ALL');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands' | 'lines' | 'colors' | 'units'>('products');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'products', label: 'Productos', icon: Package, count: products.length },
    { id: 'categories', label: 'Categorías', icon: Layers, count: categories.length },
    { id: 'brands', label: 'Marcas', icon: Tag, count: brands.length },
    { id: 'lines', label: 'Líneas', icon: GitBranch, count: lines.length },
    { id: 'colors', label: 'Colores', icon: Palette, count: colors.length },
    { id: 'units', label: 'Unidades', icon: Scale, count: units.length },
  ];

  const getFilteredItems = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'products': return products.filter(p => p.name.toLowerCase().includes(term) || p.code?.toLowerCase().includes(term) || p.brandCertificate?.toLowerCase().includes(term) || p.line?.name?.toLowerCase().includes(term) || p.color?.name?.toLowerCase().includes(term));
      case 'categories': return categories.filter(c => c.name.toLowerCase().includes(term));
      case 'brands': return brands.filter(b => b.name.toLowerCase().includes(term));
      case 'lines': return lines.filter(l => l.name.toLowerCase().includes(term));
      case 'colors': return colors.filter(c => c.name.toLowerCase().includes(term));
      case 'units': return units.filter(u => u.name.toLowerCase().includes(term) || u.symbol.toLowerCase().includes(term));
      default: return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white text-[#004A99] shadow-2xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#004A99]' : 'text-slate-400'}`} />
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${isActive ? 'bg-blue-50 text-[#004A99]' : 'bg-slate-200/80 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-2.5 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder={`Buscar ${activeTab === 'products' ? 'productos' : activeTab === 'categories' ? 'categorías' : activeTab === 'brands' ? 'marcas' : activeTab === 'lines' ? 'líneas' : activeTab === 'colors' ? 'colores' : 'unidades'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        {canWrite ? (
          <button 
            onClick={() => onNew(activeTab)}
            className="w-full md:w-auto h-8 bg-[#004A99] hover:bg-blue-800 text-white px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : activeTab === 'lines' ? 'Línea' : activeTab === 'colors' ? 'Color' : 'Unidad'}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 h-8 bg-slate-100 text-slate-400 px-4 rounded-lg text-xs font-bold cursor-not-allowed">
            <Lock className="w-3.5 h-3.5" />
            Nuevo {activeTab === 'products' ? 'Producto' : activeTab === 'categories' ? 'Categoría' : activeTab === 'brands' ? 'Marca' : activeTab === 'lines' ? 'Línea' : activeTab === 'colors' ? 'Color' : 'Unidad'}
          </div>
        )}
      </div>

      {/* Content Area */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {activeTab === 'products' ? (
                  <>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Producto</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Categoría / Marca</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Empaque</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Precio</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Nombre</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">Relacionados</th>
                  </>
                )}
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {getFilteredItems().map((item: any) => (
                <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors group ${!item.isActive && activeTab === 'products' ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {activeTab === 'products' && (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      )}
                        <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {activeTab === 'colors' && item.hexCode && (
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.hexCode }}
                              title={item.hexCode}
                            />
                          )}
                          <span className="font-bold text-slate-900">{item.name}</span>
                        </div>
                        {item.code && <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{item.code}</span>}
                        {activeTab === 'units' && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-blue-600 font-bold">{item.symbol}</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[9px] font-mono font-bold text-blue-700 uppercase">
                              SUNAT: {item.sunatCode || 'NIU'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-mono font-bold text-slate-600">
                              Equiv: {item.equivalence ?? 1}
                            </span>
                          </div>
                        )}
                        {activeTab === 'colors' && item.hexCode && <span className="text-[10px] text-slate-400 font-mono">{item.hexCode}</span>}
                        
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
                            {item.isOnSale && (
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 animate-pulse">
                                <Sparkles className="w-2 h-2" /> Oferta {item.discountPercent ? `-${item.discountPercent}%` : ''}
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
                          {(item.line?.name || item.color?.name) && (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {item.line?.name && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase">
                                  {item.line.name}
                                </span>
                              )}
                              {item.color?.name && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase">
                                  {item.color.hexCode && (
                                    <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: item.color.hexCode }} />
                                  )}
                                  {item.color.name}
                                </span>
                              )}
                            </div>
                          )}
                          {item.brandCertificate && (
                            <span className="mt-0.5 inline-flex w-fit items-center px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[9px] font-mono font-bold text-indigo-700 uppercase">
                              Cert: {item.brandCertificate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.package?.name ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Box className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold text-blue-700">1 {item.package.name}</span>
                              <span className="text-[9px] text-slate-400">=</span>
                              <span className="text-[10px] font-bold text-slate-600">{item.quantityPerPackage || 1}</span>
                              <span className="text-[10px] text-slate-500">{item.subPackage?.name || item.unit?.name || 'un.'}</span>
                            </div>
                            {item.subPackage?.name && (
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-700">1 {item.subPackage.name}</span>
                                <span className="text-[9px] text-slate-400">=</span>
                                <span className="text-[10px] font-bold text-slate-600">{item.quantityPerSubPackage || 1}</span>
                                <span className="text-[10px] text-slate-500">{item.unit?.name || 'un.'}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100 mt-0.5">
                              <Package className="w-3 h-3 text-emerald-500" />
                              <span className="text-[9px] font-black text-emerald-600">Total: {calculateTotalUnitsPerPackage({ quantityPerPackage: item.quantityPerPackage, quantityPerSubPackage: item.quantityPerSubPackage })} {item.unit?.name || 'un.'}</span>
                            </div>
                          </div>
                        ) : item.subPackage?.name ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] font-bold text-amber-700">1 {item.subPackage.name}</span>
                              <span className="text-[9px] text-slate-400">=</span>
                              <span className="text-[10px] font-bold text-slate-600">{item.quantityPerSubPackage || 1}</span>
                              <span className="text-[10px] text-slate-500">{item.unit?.name || 'un.'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sin empaque</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end tabular-nums">
                          <span className="font-bold text-slate-900 text-xs whitespace-nowrap">S/ {formatNumber(item.salePrice)}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium whitespace-nowrap">
                            <span className="text-slate-400">Costo: S/ {formatNumber(item.costPrice || 0)}</span>
                            <span className="text-blue-600 font-bold">({item.profitMargin || 0}%)</span>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-2.5 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {item._count?.products || 0} Productos
                      </span>
                    </td>
                  )}

                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => onEdit(activeTab, item)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDelete(activeTab, item.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
