import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRightLeft, Search as SearchIcon, Trash2, Package, Plus } from 'lucide-react';

interface TransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  warehouses: any[];
  products: any[];
}

export const TransferForm: React.FC<TransferFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  loading,
  warehouses,
  products
}) => {
  const [prodSearch, setProdSearch] = useState('');

  const addItem = (p: any) => {
    if (formData.items.find((i: any) => i.productId === p.id)) return;
    setFormData({
      ...formData,
      items: [...formData.items, { productId: p.id, name: p.name, quantity: 1 }]
    });
    setProdSearch('');
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItemQty = (index: number, qty: number) => {
    const newItems = [...formData.items];
    newItems[index].quantity = qty;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmitInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromWarehouseId || !formData.toWarehouseId) {
      alert('Seleccione almacenes de origen y destino');
      return;
    }
    if (formData.fromWarehouseId === formData.toWarehouseId) {
      alert('El almacén de origen y destino no pueden ser el mismo');
      return;
    }
    if (formData.items.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }
    await onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.98, y: 20 }} 
          className="relative w-full h-full max-w-[98%] max-h-[98vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
        >
            {/* --- BARRA DE TITULO ESTILO ERP --- */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">Nueva Transferencia de Mercadería</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitInternal} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* --- SECCIÓN 1: CABECERA Y ALMACENES --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-24">Origen (SALE)</span>
                    <select 
                      required
                      value={formData.fromWarehouseId}
                      onChange={e => setFormData({...formData, fromWarehouseId: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white flex-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                  </div>

                  <div className="md:col-span-5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-24">Destino (ENTRA)</span>
                    <select 
                      required
                      value={formData.toWarehouseId}
                      onChange={e => setFormData({...formData, toWarehouseId: e.target.value})}
                      className="h-8 border border-blue-200 rounded px-2 text-xs font-bold bg-blue-50 text-blue-700 flex-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16">Fecha</span>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1" />
                  </div>
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-20">Documento</span>
                    <input type="text" placeholder="G001-00001" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1" />
                  </div>
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-24">Buscar Item</span>
                    <div className="relative flex-1">
                      <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Agregar producto..." 
                        value={prodSearch}
                        onChange={e => setProdSearch(e.target.value)}
                        className="h-8 w-full pl-9 pr-4 bg-slate-50 border border-slate-200 rounded text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      {prodSearch && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded shadow-2xl max-h-48 overflow-y-auto">
                          {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => addItem(p)}
                              className="p-2 hover:bg-blue-50 cursor-pointer text-[11px] font-bold border-b border-slate-50 flex justify-between items-center"
                            >
                              <span>{p.name}</span>
                              <Plus className="w-3 h-3 text-blue-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40 text-center">Cantidad a Transferir</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item: any, index: number) => (
                        <tr key={item.productId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-1.5 text-[10px] font-bold text-slate-400">{index + 1}</td>
                          <td className="px-4 py-1.5 font-bold text-slate-700 text-xs">{item.name}</td>
                          <td className="px-4 py-1.5">
                            <input 
                              type="number" 
                              min="1" 
                              value={item.quantity} 
                              onChange={e => updateItemQty(index, parseInt(e.target.value) || 1)}
                              className="h-7 w-full px-2 bg-white border border-slate-200 rounded text-center font-black text-blue-600 outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-1.5 text-center">
                            <button type="button" onClick={() => removeItem(index)} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center">
                            <Package className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay productos en la lista</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-8 h-10 bg-blue-600 hover:bg-blue-700 text-white font-black rounded shadow-lg shadow-blue-100 transition-all flex items-center gap-2 disabled:bg-blue-300 uppercase text-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {loading ? 'Procesando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
