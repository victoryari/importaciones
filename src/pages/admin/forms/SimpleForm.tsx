import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, ImageIcon, Tag, Layers, Scale, MapPin, GitBranch, Palette } from 'lucide-react';
import axios from 'axios';

interface SimpleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  type: 'categories' | 'brands' | 'units' | 'warehouses' | 'lines' | 'colors';
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
  const [sunatUnits, setSunatUnits] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && type === 'units' && sunatUnits.length === 0) {
      axios.get('/api/sunat/TABLA_06')
        .then(res => setSunatUnits(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }
  }, [isOpen, type, sunatUnits.length]);

  const titles = {
    categories: { title: 'Gestión de Categoría', icon: Layers, label: 'Categoría' },
    brands: { title: 'Gestión de Marca', icon: Tag, label: 'Marca' },
    units: { title: 'Gestión de Unidad', icon: Scale, label: 'Unidad' },
    warehouses: { title: 'Gestión de Almacén', icon: MapPin, label: 'Almacén' },
    lines: { title: 'Gestión de Línea', icon: GitBranch, label: 'Línea' },
    colors: { title: 'Gestión de Color', icon: Palette, label: 'Color' }
  };

  const config = titles[type] || titles.categories;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Header Institucional ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <Icon className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-tight">{config.title}</h2>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Maestro de {config.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="simple-erp-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Icon className="w-3.5 h-3.5 text-blue-700" />
                  <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Datos de {config.label}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre de la {config.label}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={`Ej: ${type === 'categories' ? 'Electrónica' : type === 'brands' ? 'Nike' : type === 'lines' ? 'Hogar' : type === 'colors' ? 'Azul' : 'Unidad'}`}
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                    className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none bg-white uppercase"
                  />
                </div>

                {type === 'colors' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Color Visual (Opcional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.hexCode || '#2563EB'}
                        onChange={e => setFormData({ ...formData, hexCode: e.target.value.toUpperCase() })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="#2563EB"
                        value={formData.hexCode || ''}
                        onChange={e => setFormData({ ...formData, hexCode: e.target.value.toUpperCase() })}
                        className="flex-1 h-8 px-2.5 rounded border border-slate-300 font-mono text-xs font-bold text-slate-800 bg-white outline-none focus:border-blue-500"
                      />
                      {formData.hexCode && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, hexCode: '' })}
                          className="h-8 px-2.5 text-[10px] font-bold text-slate-500 hover:text-red-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!['units', 'lines', 'colors'].includes(type) && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Imagen / Logo Representativo</label>
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                        {formData.image || formData.logo ? (
                          <img src={formData.image || formData.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[11px] text-slate-500 leading-tight">Sube una imagen cuadrada para una mejor visualización.</p>
                        <label className="inline-flex items-center h-7 bg-white border border-slate-300 px-3 rounded text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors uppercase">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Siglas (UND, CAJ, PQT)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="UND"
                          value={formData.symbol || ''}
                          onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                          className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs font-bold font-mono text-blue-700 focus:border-blue-500 outline-none bg-white uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Equivalencia</label>
                        <input 
                          type="number" 
                          step="0.0001"
                          min="0.0001"
                          required
                          placeholder="1"
                          value={formData.equivalence ?? 1}
                          onChange={e => setFormData({...formData, equivalence: e.target.value})}
                          className="w-full h-8 px-2.5 rounded border border-slate-300 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none bg-white text-right tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-800 uppercase">Unidad Internacional (SUNAT Cat. 03)</label>
                      <select
                        value={formData.sunatCode || 'NIU'}
                        onChange={e => setFormData({...formData, sunatCode: e.target.value})}
                        className="w-full h-8 px-2 rounded border border-slate-300 text-xs font-medium text-slate-800 focus:border-blue-500 outline-none bg-white"
                      >
                        {sunatUnits.length > 0 ? (
                          sunatUnits.map((u: any) => (
                            <option key={u.code} value={u.code}>{u.code} - {u.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="NIU">NIU - Unidad (bienes)</option>
                            <option value="ZZ">ZZ - Unidad (servicios / otros)</option>
                            <option value="BX">BX - Caja</option>
                            <option value="PK">PK - Paquete</option>
                            <option value="KGM">KGM - Kilogramo</option>
                            <option value="MTR">MTR - Metro</option>
                            <option value="LTR">LTR - Litro</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Footer Institucional ERP */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
              </button>
              <button 
                type="submit"
                form="simple-erp-form"
                disabled={loading}
                className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
