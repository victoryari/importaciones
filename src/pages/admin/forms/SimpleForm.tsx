import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, ImageIcon, Tag, Layers, Scale, MapPin } from 'lucide-react';

interface SimpleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  type: 'categories' | 'brands' | 'units' | 'warehouses';
  loading: boolean;
  handleFileUpload: (file: File) => Promise<string>;
}

export const SimpleForm: React.FC<SimpleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  type,
  loading,
  handleFileUpload
}) => {
  const titles = {
    categories: { title: 'Gestión de Categoría', icon: Layers, label: 'Categoría' },
    brands: { title: 'Gestión de Marca', icon: Tag, label: 'Marca' },
    units: { title: 'Gestión de Unidad', icon: Scale, label: 'Unidad' },
    warehouses: { title: 'Gestión de Almacén', icon: MapPin, label: 'Almacén' }
  };

  const config = titles[type] || titles.categories;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-5xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{config.title}</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Maestro de {config.label}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all border border-slate-100"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={onSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la {config.label}</label>
                <input 
                  type="text" 
                  required
                  placeholder={`Ej: ${type === 'categories' ? 'Electrónica' : type === 'brands' ? 'Nike' : 'Unidad'}`}
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                  className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                />
              </div>

              {type !== 'units' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagen / Logo Representativo</label>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-4xl border-2 border-dashed border-slate-200">
                    <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                      {formData.image || formData.logo ? (
                        <img src={formData.image || formData.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-500 leading-tight">Sube una imagen cuadrada para una mejor visualización.</p>
                      <label className="inline-block bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                        Seleccionar Archivo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              setFormData({...formData, [type === 'categories' ? 'image' : 'logo']: url});
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {type === 'units' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Símbolo (UND, KG, etc.)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="UND"
                    value={formData.symbol || ''}
                    onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                    className="w-full px-5 py-4 rounded-3xl border-2 border-slate-100 font-black text-blue-700 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-4xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:bg-blue-300"
                >
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </button>
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-4xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
