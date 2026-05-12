import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Search, Plus, Trash2, Calendar, FileText, User, Building2, MapPin, Calculator, Save, Package, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { formatNumber } from '../../../lib/utils';

interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token?: string | null;
  formData: any;
  setFormData: (data: any) => void;
}

export const PurchaseEntryForm: React.FC<PurchaseFormProps> = ({ isOpen, onClose, onSuccess, token, formData, setFormData }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [docTypes, setDocTypes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchExchangeRate = async (date: string, currentCurrency: string) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/exchange-rates/fetch-by-date/${date}`, config);
      if (res.data) {
        const isSoles = currentCurrency === 'PEN' || currentCurrency === '1';
        if (isSoles) {
          setFormData(prev => ({ ...prev, exchangeRate: res.data.buy_rate.toString() }));
        } else {
          setFormData(prev => ({ ...prev, exchangeRate: res.data.sell_rate.toString() }));
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }
  };

  useEffect(() => {
    if (isOpen && formData.date) {
      fetchExchangeRate(formData.date, formData.currency);
    }
  }, [isOpen, formData.date, formData.currency]);

  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [sRes, pRes, wRes, dRes] = await Promise.all([
        axios.get('/api/suppliers', config),
        axios.get('/api/products', config),
        axios.get('/api/warehouses', config),
        axios.get('/api/sunat/document_type', config)
      ]);
      setSuppliers(sRes.data);
      setProducts(pRes.data);
      setDocTypes(dRes.data);
      const activeWarehouses = wRes.data.filter((w: any) => w.isActive !== false);
      setWarehouses(activeWarehouses);
      
      // Auto-select TRANSITORIO or COMP/IMP warehouse if exists
      const preferred = activeWarehouses.find((w: any) => 
        w.type === 'TRANSITORIO' || 
        w.name.toUpperCase().includes('COMP') || 
        w.name.toUpperCase().includes('IMP')
      );
      if (preferred) setFormData(prev => ({ ...prev, warehouseId: preferred.id.toString() }));
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = (p: any) => {
    // Se permite duplicar el producto para manejar diferentes lotes en la misma compra
    setFormData({
      ...formData,
      items: [...formData.items, { 
        productId: p.id, 
        name: p.name, 
        unitSymbol: p.unit?.symbol || 'UND',
        availableUnits: [
          p.unit ? { id: p.unit.id, symbol: p.unit.symbol, name: p.unit.name, factor: 1 } : null,
          p.package ? { id: p.package.id, symbol: p.package.symbol, name: p.package.name, factor: p.quantityPerPackage } : null,
          p.subPackage ? { id: p.subPackage.id, symbol: p.subPackage.symbol, name: p.subPackage.name, factor: p.quantityPerSubPackage } : null
        ].filter(Boolean),
        lotNumber: '',
        quantity: 1, 
        price: p.costPrice || 0 
      }]
    });
    setProdSearch('');
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const total = formData.items.reduce((acc, i) => acc + (i.quantity * i.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0 || !formData.warehouseId) {
      alert('Complete los datos obligatorios (Proveedor, Almacén e Ítems)');
      return;
    }

    setLoading(true);
    try {
      if (formData.id) {
        await axios.put(`/api/purchases/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/purchases', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        supplierId: '', supplierName: '', docType: 'FACTURA', docSeries: '', docNumber: '',
        date: new Date().toISOString().split('T')[0], currency: 'PEN', exchangeRate: '1.00',
        warehouseId: '', observation: '', items: []
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al procesar compra');
    } finally {
      setLoading(false);
    }
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
                <ShoppingCart className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">{formData.id ? 'Editar Registro de Compra / Importación' : 'Nuevo Registro de Compra / Importación'}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Estado:</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">BORRADOR</span>
                </div>
                <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* --- SECCIÓN 1: CABECERA Y DOCUMENTO --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Documento</span>
                    <select value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1">
                      {docTypes.length > 0 ? (
                        docTypes.map(d => <option key={d.code} value={d.code}>{d.name}</option>)
                      ) : (
                        <>
                          <option value="01">FACTURA</option>
                          <option value="03">BOLETA</option>
                          <option value="00">OTROS</option>
                        </>
                      )}
                    </select>
                    <input type="text" placeholder="SERIE" value={formData.docSeries} onChange={e => setFormData({...formData, docSeries: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-20" />
                    <input type="text" placeholder="NÚMERO" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-28" />
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Fecha</span>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1" />
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Moneda</span>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="h-8 border border-slate-300 rounded px-1 text-xs font-bold bg-white flex-1">
                      <option value="PEN">SOLES (S/)</option>
                      <option value="USD">DOLARES ($)</option>
                    </select>
                    <span className="text-[11px] font-bold text-slate-600 ml-2">TC</span>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold w-20 text-right bg-yellow-50" />
                    <button 
                      type="button" 
                      onClick={() => fetchExchangeRate(formData.date, formData.currency)}
                      className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="Refrescar tipo de cambio"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Almacén</span>
                    <select 
                      required
                      value={formData.warehouseId} 
                      onChange={e => setFormData({...formData, warehouseId: e.target.value})} 
                      className="h-8 border border-blue-200 rounded px-1 text-xs font-bold bg-blue-50 text-blue-700 flex-1 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.type ? `(${w.type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- SECCIÓN 2: PROVEEDOR Y BUSQUEDA --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-20">Proveedor</span>
                    <select 
                      required
                      value={formData.supplierId} 
                      onChange={e => {
                        const s = suppliers.find(sup => sup.id === parseInt(e.target.value));
                        setFormData({...formData, supplierId: e.target.value, supplierName: s?.name || ''});
                      }} 
                      className="h-9 border border-slate-300 rounded px-3 text-xs font-bold bg-white flex-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar Proveedor...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.docNumber} - {s.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-28">Agregar Producto</span>
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre o código..." 
                        value={prodSearch}
                        onChange={e => setProdSearch(e.target.value)}
                        className="h-9 w-full pl-9 pr-4 bg-slate-50 border border-slate-200 rounded text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {prodSearch && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                          {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.code?.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => addItem(p)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 transition-colors flex justify-between items-center">
                              <div>
                                <div className="text-[11px] font-bold text-slate-700">{p.name}</div>
                                <div className="text-[9px] text-slate-400">SKU: {p.code} | Stock: {p.stock}</div>
                              </div>
                              <Plus className="w-3 h-3 text-blue-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 3: TABLA DE ITEMS --- */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">U.M.</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Nro. Lote</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">Cantidad</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 text-center">Valor Unit.</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 text-center">Precio Unit.</th>
                          <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32 text-right">Subtotal</th>
                          <th className="px-4 py-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.items.map((item, index) => (
                          <tr key={`${item.productId}-${index}`} className="hover:bg-slate-50/50">
                            <td className="px-4 py-1.5 text-[10px] font-bold text-slate-400">{index + 1}</td>
                            <td className="px-4 py-1.5">
                              <div className="text-[11px] font-bold text-slate-700">{item.name}</div>
                            </td>
                            <td className="px-4 py-1.5 text-center">
                              {item.availableUnits && item.availableUnits.length > 1 ? (
                                <select 
                                  value={item.unitSymbol} 
                                  onChange={e => updateItem(index, 'unitSymbol', e.target.value)}
                                  className="bg-blue-50 border border-blue-200 rounded px-1 py-0.5 text-[10px] font-black text-blue-600 outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                  {item.availableUnits.map((u: any) => (
                                    <option key={u.id} value={u.symbol}>{u.symbol}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-black text-slate-500">{item.unitSymbol}</span>
                              )}
                            </td>
                            <td className="px-4 py-1.5">
                              <input type="text" value={item.lotNumber} onChange={e => updateItem(index, 'lotNumber', e.target.value)} placeholder="Opcional" className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-center font-bold text-[10px] outline-none focus:border-blue-400" />
                            </td>
                            <td className="px-4 py-1.5">
                              <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-center font-black text-xs outline-none focus:border-blue-400" />
                            </td>
                            <td className="px-4 py-1.5">
                              <input 
                                type="number" 
                                step="0.0001" 
                                value={(item.price / 1.18).toFixed(4)} 
                                onChange={e => {
                                  const valor = parseFloat(e.target.value) || 0;
                                  updateItem(index, 'price', (valor * 1.18).toFixed(4));
                                }} 
                                className="w-full h-7 px-2 bg-slate-50 border border-slate-200 rounded text-center font-bold text-xs text-slate-600 outline-none focus:border-blue-400" 
                              />
                            </td>
                            <td className="px-4 py-1.5">
                              <input 
                                type="number" 
                                step="0.0001" 
                                value={item.price} 
                                onChange={e => updateItem(index, 'price', e.target.value)} 
                                className="w-full h-7 px-2 bg-white border border-slate-200 rounded text-center font-black text-xs text-emerald-600 outline-none focus:border-emerald-400" 
                              />
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              <div className="text-[11px] font-black text-slate-800">{formatNumber(item.quantity * item.price)}</div>
                            </td>
                            <td className="px-4 py-1.5 text-center">
                              <button type="button" onClick={() => removeItem(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                        {formData.items.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-10 text-center">
                              <Package className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin productos seleccionados</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* --- SECCIÓN 4: TOTALES Y OBSERVACIONES --- */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">Observaciones</span>
                    <textarea 
                      value={formData.observation} 
                      onChange={e => setFormData({...formData, observation: e.target.value})} 
                      className="w-full h-16 p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-blue-400" 
                      placeholder="Notas adicionales..."
                    />
                  </div>
                  <div className="md:col-span-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center items-end space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Subtotal:</span>
                      <span className="text-sm font-bold text-slate-700">{formData.currency} {formatNumber(total / 1.18)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">IGV (18%):</span>
                      <span className="text-sm font-bold text-slate-700">{formData.currency} {formatNumber(total - (total / 1.18))}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 w-full flex justify-end gap-6 items-center">
                      <span className="text-xs font-black text-slate-800 uppercase">Total:</span>
                      <span className="text-2xl font-black text-blue-700">{formData.currency} {formatNumber(total)}</span>
                    </div>
                  </div>
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
                  <Save className="w-4 h-4" />
                  {loading ? 'Procesando...' : 'Registrar Ingreso'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};