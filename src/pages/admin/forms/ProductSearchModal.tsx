import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package, Check, AlertCircle, FileSearch } from 'lucide-react';
import axios from 'axios';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: any) => void;
  token: string;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ isOpen, onClose, onSelect, token }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/api/products/search?q=${val}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalStock = (product: any) => {
    if (!product.stockRecords) return product.stock || 0;
    return product.stockRecords.reduce((acc: number, record: any) => acc + record.quantity, 0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 20 }} 
            className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* Header Estilo ERP */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">Seleccionar Producto</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              {/* Search Bar Area */}
              <div className="p-3 bg-white border-b border-slate-200 shadow-sm">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Escriba código o nombre para buscar..." 
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-12 py-2 rounded border border-slate-300 bg-white font-bold text-xs text-slate-700 focus:border-blue-500 outline-none transition-all"
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Table Area */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="bg-white rounded border border-slate-300 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="sticky top-0 bg-[#E2E8F0] text-slate-700 z-10">
                      <tr className="border-b border-slate-300">
                        <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-12">IMG</th>
                        <th className="px-2 py-1 font-bold border-r border-slate-300 w-24">Código</th>
                        <th className="px-2 py-1 font-bold border-r border-slate-300">Descripción del Producto</th>
                        <th className="px-2 py-1 font-bold border-r border-slate-300 text-center w-24">Stock Total</th>
                        <th className="px-2 py-1 font-bold border-r border-slate-300 text-right w-24">Precio Venta</th>
                        <th className="px-2 py-1 font-bold text-center w-24">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {results.map((product) => {
                        const totalStock = calculateTotalStock(product);
                        const productImages = Array.isArray(product.images) ? product.images : [];
                        const firstImage = productImages[0] || '';
                        
                        return (
                          <tr key={product.id} className="hover:bg-blue-50 transition-colors group">
                            <td className="px-2 py-1 border-r border-slate-200 text-center">
                              <div className="relative w-8 h-8 mx-auto group/img">
                                <div className="w-8 h-8 rounded border border-slate-200 bg-white overflow-hidden shadow-sm flex items-center justify-center transition-all group-hover/img:scale-[4] group-hover/img:z-50 group-hover/img:shadow-2xl group-hover/img:fixed group-hover/img:translate-x-12 group-hover/img:border-blue-400">
                                  {firstImage ? (
                                    <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-3 h-3 text-slate-300" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 font-bold text-slate-500 group-hover:text-blue-700">{product.code}</td>
                            <td className="px-2 py-1 border-r border-slate-200">
                              <div className="font-bold text-slate-700">{product.name}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase">{product.category?.name} | {product.brand?.name}</div>
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-center">
                              <span className={`px-2 py-0.5 rounded font-bold ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {totalStock} {product.unit?.symbol || 'UND'}
                              </span>
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200 text-right font-bold text-slate-700">
                              S/ {parseFloat(product.salePrice).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button 
                                onClick={() => onSelect(product)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase transition-all flex items-center gap-1 mx-auto shadow-sm"
                              >
                                <Check className="w-3 h-3" /> Seleccionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {query.length >= 2 && results.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-400 font-bold text-xs italic">No se encontraron productos para "{query}"</p>
                          </td>
                        </tr>
                      )}
                      {query.length < 2 && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <Search className="w-12 h-12 text-slate-200 mx-auto mb-2 opacity-50" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Ingrese código o descripción para buscar</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
