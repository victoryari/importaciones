import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: any) => void;
  token: string;
  allowZeroStock?: boolean;
  selectedWarehouseId?: number | string;
  warehouses?: any[];
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  token, 
  allowZeroStock = false,
  selectedWarehouseId,
  warehouses = []
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`/api/products/search?q=${val}`, { headers: { Authorization: `Bearer ${token}` } });
      setResults(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getWarehouseStock = (product: any, whId: number | string) => {
    if (!product.stockRecords || !whId) return 0;
    const targetId = parseInt(whId.toString());
    const record = product.stockRecords.find((r: any) => r.warehouseId === targetId);
    return record ? record.quantity : 0;
  };

  const calculateTotalStock = (product: any) => {
    if (!product.stockRecords) return product.stock || 0;
    return product.stockRecords.reduce((acc: number, record: any) => {
      const whType = record.warehouse?.type?.toUpperCase() || '';
      const whName = record.warehouse?.name?.toUpperCase() || '';
      const isInternal = ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA', 'CONTROL', 'EXISTENCIAS'].includes(whType) || 
                       whName.includes('DESPACHO') || whName.includes('COMPROBANTE') || whName.includes('TRANSITO') || whName.includes('EXISTENCIAS');
      if (isInternal) return acc;
      return acc + record.quantity;
    }, 0);
  };

  const selectedWhName = selectedWarehouseId && warehouses.find(w => w.id === parseInt(selectedWarehouseId.toString()))?.name;

  const filteredResults = results.filter((product) => {
    if (allowZeroStock) return true;
    return calculateTotalStock(product) > 0;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-200 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }} 
            className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-slate-300"
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-blue-800" />
                <h2 className="text-xs font-bold text-slate-700 tracking-tight">Buscar Producto</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-2 bg-white border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Código o nombre del producto..." 
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 rounded border border-slate-300 bg-slate-50 font-bold text-xs text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all"
                />
                {loading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {filteredResults.length > 0 ? (
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider w-10">Foto</th>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider w-8">Cod.</th>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-center w-28">
                        Stock {selectedWhName ? `(${selectedWhName})` : ''}
                      </th>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-right w-24">Costo</th>
                      <th className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map((product) => {
                      const totalStock = calculateTotalStock(product);
                      const whStock = selectedWarehouseId ? getWarehouseStock(product, selectedWarehouseId) : totalStock;
                      const otherStock = totalStock - whStock;
                      const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
                      return (
                        <tr key={product.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => onSelect(product)}>
                          <td className="px-2 py-2">
                            {imageUrl ? (
                              <div 
                                className="relative w-8 h-8 z-10"
                                onMouseEnter={(e) => {
                                  setZoomedImage(imageUrl);
                                  setMousePos({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setZoomedImage(null)}
                              >
                                <img 
                                  src={imageUrl} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover rounded shadow-sm cursor-zoom-in"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                <Package className="w-4 h-4 text-slate-300" />
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 font-mono text-xs font-bold text-slate-600">{product.code || '-'}</td>
                          <td className="px-2 py-2">
                            <div className="font-bold text-slate-800 text-xs">{product.name}</div>
                            <div className="text-[9px] text-slate-400">{product.category?.name} {product.brand?.name ? `• ${product.brand.name}` : ''}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${whStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                {whStock} {product.unit?.symbol || 'un.'}
                              </span>
                              {selectedWarehouseId && otherStock > 0 && (
                                <span className="text-[8px] font-medium text-slate-400 bg-slate-100 px-1 py-0.2 rounded" title={`Stock en otras sedes: ${otherStock}`}>
                                  +{otherStock} en otras sedes
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-slate-700 text-xs">
                            S/ {Number(product.costPrice || product.salePrice || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  {loading ? (
                    <>
                      <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest">Buscando...</p>
                    </>
                  ) : query.length >= 2 ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="text-xs font-bold">Sin resultados para "{query}"</p>
                    </>
                  ) : (
                    <>
                      <Search className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Escriba para buscar</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase">{filteredResults.length} producto{filteredResults.length !== 1 ? 's' : ''} encontrado{filteredResults.length !== 1 ? 's' : ''}</span>
              <button onClick={onClose} className="text-[9px] font-bold text-slate-500 hover:text-slate-700 uppercase">Cerrar</button>
            </div>
          </motion.div>
          
          <AnimatePresence>
            {zoomedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[99999] pointer-events-none rounded-xl shadow-2xl overflow-hidden border-4 border-white bg-white"
                style={{
                  left: mousePos.x + 20,
                  top: Math.max(20, mousePos.y - 120),
                  width: '240px',
                  height: '240px'
                }}
              >
                <img src={zoomedImage} className="w-full h-full object-contain" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
