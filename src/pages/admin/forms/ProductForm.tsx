import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Edit2, Save, X, Image as ImageIcon, Upload, Trash2, Globe, Package, Calendar, Power, Info, Sparkles } from 'lucide-react';

import axios from 'axios';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  categories: any[];
  brands: any[];
  units: any[];
  handleFileUpload: (file: File) => Promise<string>;
  setLoading: (loading: boolean) => void;
  token?: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingItem,
  loading,
  categories,
  brands,
  units,
  handleFileUpload,
  setLoading,
  token
}) => {
  const [existenceTypes, setExistenceTypes] = React.useState<any[]>([]);
  const [valuationMethods, setValuationMethods] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && token) {
      axios.get('/api/sunat/existence_type', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setExistenceTypes(res.data))
        .catch(() => {});
      axios.get('/api/sunat/valuation_method', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setValuationMethods(res.data))
        .catch(() => {});
    }
  }, [isOpen, token]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-0 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 10 }} 
            className="relative w-full h-full max-w-[95%] max-h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* Header ERP Style */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">
                  {editingItem ? 'Mantenimiento de Producto' : 'Registro de Nuevo Producto'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {editingItem && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID:</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{editingItem.id}</span>
                  </div>
                )}
                <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  {/* Columna Izquierda: Datos Principales */}
                  <div className="lg:col-span-8 space-y-3">
                    <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tighter">Información General</legend>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">SKU / Código</label>
                          <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-slate-50" placeholder="AUTOGEN" />
                        </div>
                        <div className="md:col-span-8 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Comercial</label>
                          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-blue-50 text-blue-900" />
                        </div>
                        
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoría</label>
                          <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Seleccionar--</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Marca</label>
                          <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Seleccionar--</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unidad Base</label>
                          <select value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Seleccionar--</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                          </select>
                        </div>

                        {/* Campos SUNAT */}
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-blue-700 uppercase ml-1">Tipo de Existencia (SUNAT)</label>
                          <select value={formData.existenceTypeCode || '01'} onChange={e => setFormData({...formData, existenceTypeCode: e.target.value})} className="h-8 w-full border border-blue-200 rounded px-1 text-xs font-bold bg-white">
                            {existenceTypes.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-blue-700 uppercase ml-1">Método de Valuación (SUNAT)</label>
                          <select value={formData.valuationMethodCode || '1'} onChange={e => setFormData({...formData, valuationMethodCode: e.target.value})} className="h-8 w-full border border-blue-200 rounded px-1 text-xs font-bold bg-white">
                            {valuationMethods.map(m => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <legend className="text-[10px] font-bold text-emerald-700 px-2 uppercase tracking-tighter">Logística y Empaque</legend>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Empaque Mayor</label>
                          <select value={formData.packageId || ''} onChange={e => setFormData({...formData, packageId: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Ninguno--</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cant. Base</label>
                          <input type="number" min="1" value={formData.quantityPerPackage || 1} onChange={e => setFormData({...formData, quantityPerPackage: parseInt(e.target.value) || 1})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center" />
                        </div>
                        <div className="md:col-span-4 space-y-1 border-l border-slate-100 pl-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Sub Empaque</label>
                          <select value={formData.subPackageId || ''} onChange={e => setFormData({...formData, subPackageId: e.target.value})} className="h-8 w-full border border-slate-300 rounded px-1 text-xs font-bold bg-white">
                            <option value="">--Ninguno--</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cant. Sub</label>
                          <input type="number" min="1" value={formData.quantityPerSubPackage || 1} onChange={e => setFormData({...formData, quantityPerSubPackage: parseInt(e.target.value) || 1})} className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center" />
                        </div>
                      </div>
                    </fieldset>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2"><Info className="w-3 h-3" /> Descripción General</label>
                        <textarea rows={6} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-medium resize-y focus:ring-1 focus:ring-blue-500 outline-none min-h-25" placeholder="Ingresa detalles generales del producto..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Características Técnicas (Puntos Clave)</label>
                        <textarea rows={6} value={formData.features || ''} onChange={e => setFormData({...formData, features: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-medium resize-y focus:ring-1 focus:ring-blue-500 outline-none min-h-25" placeholder="Usa guiones (-) para crear listas automáticas en la web, ej:
- Material de alta calidad
- Resistente al agua" />
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Imagen y Precios */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-32 h-32 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center relative group">
                          {(formData.images && formData.images.length > 0) || formData.image ? (
                            <>
                              <img src={formData.images?.[0] || formData.image} alt="Preview" className="w-full h-full object-contain" />
                              <button type="button" onClick={() => setFormData({...formData, images: [], image: ''})} className="absolute inset-0 bg-red-600/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="w-10 h-10 text-slate-200" />
                          )}
                        </div>
                        <label className="w-full h-8 bg-slate-100 border border-slate-300 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors text-[10px] font-bold uppercase">
                          <Upload className="w-3.5 h-3.5" /> Subir Imagen
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              try {
                                setLoading(true);
                                const url = await handleFileUpload(e.target.files[0]);
                                setFormData({...formData, images: [url]});
                              } catch (err: any) {
                                console.error("Upload error:", err);
                                const errorMsg = err.response?.data?.error || err.message || "Error desconocido";
                                alert(`Error al subir la imagen: ${errorMsg}`);
                              } finally {
                                setLoading(false);
                              }
                            }
                          }} />
                        </label>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Costo Unit. (S/)</label>
                          <input type="number" step="0.01" value={formData.costPrice || ''} 
                            onChange={e => {
                              const cost = parseFloat(e.target.value) || 0;
                              const margin = parseFloat(formData.profitMargin) || 0;
                              const suggested = cost * (1 + margin / 100);
                              setFormData({...formData, costPrice: e.target.value, salePrice: suggested.toFixed(2)});
                            }} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-black text-right bg-blue-50 text-blue-900" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Margen (%)</label>
                          <input type="number" step="0.1" value={formData.profitMargin || ''} 
                            onChange={e => {
                              const margin = parseFloat(e.target.value) || 0;
                              const cost = parseFloat(formData.costPrice) || 0;
                              const suggested = cost * (1 + margin / 100);
                              setFormData({...formData, profitMargin: e.target.value, salePrice: suggested.toFixed(2)});
                            }} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-black text-right" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Precio Venta Público (S/)</label>
                        <input type="number" step="0.01" value={formData.salePrice || ''} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="h-9 w-full border border-emerald-300 rounded px-2 text-sm font-black text-right bg-emerald-50 text-emerald-700" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className={`h-8 rounded flex items-center justify-center gap-2 transition-all border ${formData.isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                          <Power className="w-3.5 h-3.5" /> <span className="text-[9px] font-black uppercase">Activo</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, showInWeb: !formData.showInWeb})} className={`h-8 rounded flex items-center justify-center gap-2 transition-all border ${formData.showInWeb ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                          <Globe className="w-3.5 h-3.5" /> <span className="text-[9px] font-black uppercase">Web</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, manageLots: !formData.manageLots})} className={`h-8 rounded flex items-center justify-center gap-2 transition-all border ${formData.manageLots ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                          <Package className="w-3.5 h-3.5" /> <span className="text-[9px] font-black uppercase">Lotes</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, useExpiryDate: !formData.useExpiryDate})} className={`h-8 rounded flex items-center justify-center gap-2 transition-all border ${formData.useExpiryDate ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                          <Calendar className="w-3.5 h-3.5" /> <span className="text-[9px] font-black uppercase">Venc.</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, isOnSale: !formData.isOnSale, discountPercent: formData.isOnSale ? '' : formData.discountPercent})} className={`col-span-2 h-8 rounded flex items-center justify-center gap-2 transition-all border ${formData.isOnSale ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-white border-slate-300 text-slate-400'}`}>
                          <Sparkles className="w-3.5 h-3.5" /> <span className="text-[9px] font-black uppercase">Oferta</span>
                        </button>
                      </div>
                      {formData.isOnSale && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[9px] font-bold text-red-500 uppercase whitespace-nowrap">% Dcto:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="15"
                            value={formData.discountPercent || ''}
                            onChange={e => setFormData({...formData, discountPercent: e.target.value})}
                            className="h-7 w-full border border-red-300 rounded px-2 text-xs font-black text-right bg-red-50 text-red-700 focus:ring-2 focus:ring-red-200 outline-none"
                          />
                        </div>
                      )}
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
                  className="px-8 h-10 bg-blue-800 hover:bg-blue-900 text-white font-black rounded shadow-lg shadow-blue-100 transition-all flex items-center gap-2 disabled:bg-blue-300 uppercase text-xs"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Procesando...' : (editingItem ? 'Guardar Cambios' : 'Registrar Producto')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
