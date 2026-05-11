import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Edit2, Save, X, Image as ImageIcon, Upload, Trash2, Globe, Package, Calendar, Power } from 'lucide-react';

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
  setLoading
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                  {editingItem ? <Edit2 className="w-6 h-6 text-white" /> : <PlusCircle className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {editingItem ? 'Editar Producto Maestro' : 'Registro de Nuevo Producto'}
                  </h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Información de Catálogo y Stock</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all border border-slate-100"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={onSubmit} className="p-8 overflow-y-auto max-h-[75vh] space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código Interno</label>
                      <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all bg-slate-50" placeholder="AUTOGEN" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Barras</label>
                      <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all bg-slate-50" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial del Producto</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                      <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-white transition-all">
                        <option value="">Seleccionar...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                      <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-white transition-all">
                        <option value="">Seleccionar...</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">U. Base (Mínima)</label>
                      <select value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-white transition-all">
                        <option value="">Seleccionar...</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                      </select>
                    </div>
                  </div>

                  <fieldset className="p-4 rounded-3xl border-2 border-slate-100 bg-slate-50 space-y-4">
                    <legend className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2">Configuración de Empaque (Kardex)</legend>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empaque Mayor</label>
                        <select value={formData.packageId || ''} onChange={e => setFormData({...formData, packageId: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-white transition-all">
                          <option value="">Seleccionar...</option>
                          {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unds. Base por Empaque</label>
                        <input type="number" min="1" value={formData.quantityPerPackage || 1} onChange={e => setFormData({...formData, quantityPerPackage: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub Empaque (Opcional)</label>
                        <select value={formData.subPackageId || ''} onChange={e => setFormData({...formData, subPackageId: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-white transition-all">
                          <option value="">Ninguno</option>
                          {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unds. Base por Sub Emp.</label>
                        <input type="number" min="1" value={formData.quantityPerSubPackage || 1} onChange={e => setFormData({...formData, quantityPerSubPackage: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all bg-white" />
                      </div>
                    </div>
                  </fieldset>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción Detallada</label>
                    <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-medium text-slate-600 focus:border-blue-500 outline-none transition-all resize-none" />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Imagen del Producto</label>
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-48 h-48 bg-white rounded-4xl border-2 border-slate-100 overflow-hidden shadow-inner flex items-center justify-center relative group">
                        {(formData.images && formData.images.length > 0) || formData.image ? (
                          <>
                            <img src={formData.images?.[0] || formData.image} alt="Preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setFormData({...formData, images: [], image: ''})} className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-black gap-2">
                              <Trash2 className="w-6 h-6" /> Eliminar
                            </button>
                          </>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-slate-400">SIN IMAGEN</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <label className="w-full bg-white border-2 border-blue-100 hover:border-blue-600 hover:bg-blue-50 text-blue-600 p-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all group">
                          <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="font-black text-sm">Subir Nueva Foto</span>
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              setLoading(true);
                              const url = await handleFileUpload(e.target.files[0]);
                              setFormData({...formData, images: [url]});
                              setLoading(false);
                            }
                          }} />
                        </label>
                        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium italic">Recomendado: 800x800px (JPG/PNG)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Configuración y Visibilidad</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${formData.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                        <Power className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Activo Venta</span>
                      </button>
                      <button type="button" onClick={() => setFormData({...formData, showInWeb: !formData.showInWeb})} className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${formData.showInWeb ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                        <Globe className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Web / Ecom</span>
                      </button>
                      <button type="button" onClick={() => setFormData({...formData, manageLots: !formData.manageLots})} className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${formData.manageLots ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Control Lotes</span>
                      </button>
                      <button type="button" onClick={() => setFormData({...formData, useExpiryDate: !formData.useExpiryDate})} className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${formData.useExpiryDate ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Vencimiento</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Precio Venta (S/)</label>
                      <input type="number" step="0.01" value={formData.salePrice || ''} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-blue-200 font-black text-blue-700 focus:border-blue-500 outline-none transition-all bg-white text-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Stock Actual</label>
                      <input type="number" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-blue-200 font-black text-blue-700 focus:border-blue-500 outline-none transition-all bg-white text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-4">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:bg-blue-300">
                  <Save className="w-5 h-5" />
                  {editingItem ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-5 rounded-3xl transition-all">Cancelar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
