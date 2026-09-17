import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, X, Image as ImageIcon, Upload, Trash2, Globe, 
  Package, Calendar, Power, Info, Sparkles, Layers, Box, 
  AlertCircle, ChevronRight, RefreshCw, DollarSign
} from 'lucide-react';
import axios from 'axios';
import { validatePackagingConfig, calculateTotalUnitsPerPackage } from '../../../lib/utils';

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
  const [packagingErrors, setPackagingErrors] = React.useState<string[]>([]);
  const [showPackagingPreview, setShowPackagingPreview] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && token) {
      axios.get('/api/sunat/TABLA_05', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setExistenceTypes(res.data))
        .catch(() => {});
      axios.get('/api/sunat/TABLA_14', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setValuationMethods(res.data))
        .catch(() => {});
    }
  }, [isOpen, token]);

  React.useEffect(() => {
    const errors = validatePackagingConfig({
      packageId: formData.packageId ? parseInt(formData.packageId) : null,
      quantityPerPackage: formData.quantityPerPackage,
      subPackageId: formData.subPackageId ? parseInt(formData.subPackageId) : null,
      quantityPerSubPackage: formData.quantityPerSubPackage,
      unitId: formData.unitId ? parseInt(formData.unitId) : null,
    });
    setPackagingErrors(errors);
  }, [formData.packageId, formData.quantityPerPackage, formData.subPackageId, formData.quantityPerSubPackage, formData.unitId]);

  const getUnitById = (id: string | number) => units.find(u => u.id === parseInt(String(id)));
  const selectedUnit = getUnitById(formData.unitId);
  const selectedPackage = getUnitById(formData.packageId);
  const selectedSubPackage = getUnitById(formData.subPackageId);
  const totalUnitsPerPackage = calculateTotalUnitsPerPackage({
    quantityPerPackage: formData.quantityPerPackage,
    quantityPerSubPackage: formData.quantityPerSubPackage,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-3 overflow-hidden">
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
            className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* Header Compacto ERP */}
            <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded">
                  <Package className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {editingItem ? 'Editar Producto / Mantenimiento' : 'Registro de Nuevo Producto'}
                    </h2>
                    {editingItem && (
                      <span className="bg-white/20 text-white px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">
                        ID: {editingItem.id}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-blue-200 uppercase font-medium">Catálogo de Productos e Inventarios</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={onSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                
                {/* Columna Izquierda: Datos del Producto y Empaque */}
                <div className="lg:col-span-8 space-y-2.5">
                  
                  {/* Sección 1: Información General */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información General</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">SKU / Código</label>
                        <input 
                          type="text" 
                          value={formData.code || ''} 
                          onChange={e => setFormData({...formData, code: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold font-mono bg-slate-50 text-slate-800 focus:border-blue-500 outline-none" 
                          placeholder="AUTOGENERADO" 
                        />
                      </div>
                      <div className="md:col-span-8 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre Comercial / Descripción</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.name || ''} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2.5 text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none" 
                          placeholder="Nombre del producto..."
                        />
                      </div>
                      
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Categoría</label>
                        <select 
                          value={formData.categoryId || ''} 
                          onChange={e => setFormData({...formData, categoryId: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                        >
                          <option value="">-- SELECCIONE CATEGORÍA --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Marca</label>
                        <select 
                          value={formData.brandId || ''} 
                          onChange={e => setFormData({...formData, brandId: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                        >
                          <option value="">-- SELECCIONE MARCA --</option>
                          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>

                      {/* Campos SUNAT */}
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-blue-800 uppercase">Tipo de Existencia (SUNAT)</label>
                        <select 
                          value={formData.existenceTypeCode || '01'} 
                          onChange={e => setFormData({...formData, existenceTypeCode: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-medium text-slate-800 bg-white focus:border-blue-500 outline-none"
                        >
                          {existenceTypes.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-blue-800 uppercase">Método de Valuación (SUNAT)</label>
                        <select 
                          value={formData.valuationMethodCode || '1'} 
                          onChange={e => setFormData({...formData, valuationMethodCode: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-medium text-slate-800 bg-white focus:border-blue-500 outline-none"
                        >
                          {valuationMethods.map(m => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sección 2: Jerarquía de Empaque */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Jerarquía de Empaque y Medidas</span>
                    </div>
                    
                    {/* Nivel 1: Empaque Mayor */}
                    <div className="p-2 bg-blue-50/50 rounded border border-blue-100 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Box className="w-3 h-3 text-blue-700" />
                        <span className="text-[10px] font-bold text-blue-900 uppercase">Nivel 1: Empaque Mayor (Cajas / Master)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo de Empaque</label>
                          <select 
                            value={formData.packageId || ''} 
                            onChange={e => setFormData({...formData, packageId: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                          >
                            <option value="">-- SIN EMPAQUE MAYOR --</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Contiene ({formData.subPackageId ? 'Sub-Emp' : 'Base'})</label>
                          <input 
                            type="number" 
                            min="1" 
                            step="1"
                            value={formData.quantityPerPackage || ''} 
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              setFormData({...formData, quantityPerPackage: val > 0 ? val : ''});
                            }} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center bg-blue-50/60 text-blue-900 focus:border-blue-500 outline-none" 
                            placeholder="Ej: 10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nivel 2: Sub Empaque */}
                    <div className="p-2 bg-amber-50/50 rounded border border-amber-100 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-amber-700" />
                        <span className="text-[10px] font-bold text-amber-900 uppercase">Nivel 2: Sub-Empaque (Paquetes / Docenas)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo de Sub-Empaque</label>
                          <select 
                            value={formData.subPackageId || ''} 
                            onChange={e => setFormData({...formData, subPackageId: e.target.value})} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                          >
                            <option value="">-- SIN SUB-EMPAQUE --</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Contiene (Unidad Base)</label>
                          <input 
                            type="number" 
                            min="1" 
                            step="1"
                            value={formData.quantityPerSubPackage || ''} 
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              setFormData({...formData, quantityPerSubPackage: val > 0 ? val : ''});
                            }} 
                            className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center bg-amber-50/60 text-amber-900 focus:border-blue-500 outline-none" 
                            placeholder="Ej: 12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nivel 3: Unidad Base */}
                    <div className="p-2 bg-emerald-50/50 rounded border border-emerald-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-emerald-700" />
                          <span className="text-[10px] font-bold text-emerald-900 uppercase">Nivel 3: Unidad Base (Unidades / Piezas)</span>
                        </div>
                        <span className="text-[9px] text-emerald-700 font-bold uppercase">(Stock físico se controla en esta unidad)</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Unidad de Medida Base</label>
                        <select 
                          value={formData.unitId || ''} 
                          onChange={e => setFormData({...formData, unitId: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                          required
                        >
                          <option value="">-- SELECCIONE UNIDAD BASE --</option>
                          {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.abbreviation})</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Preview de conversión */}
                    {(formData.packageId || formData.subPackageId) && (
                      <div className="p-2 bg-slate-50 rounded border border-slate-200">
                        <button 
                          type="button"
                          onClick={() => setShowPackagingPreview(!showPackagingPreview)}
                          className="w-full flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <ChevronRight className={`w-3 h-3 transition-transform ${showPackagingPreview ? 'rotate-90' : ''}`} />
                            Resumen de Equivalencias de Empaque
                          </span>
                          <span className="text-blue-700 font-bold text-[9px]">
                            1 Empaque = {totalUnitsPerPackage} {selectedUnit?.symbol || selectedUnit?.name || 'UND'}
                          </span>
                        </button>
                        {showPackagingPreview && (
                          <div className="mt-1.5 space-y-1 pt-1.5 border-t border-slate-200 text-xs font-bold text-slate-700">
                            {selectedPackage && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">1 {selectedPackage.name}</span>
                                <span>=</span>
                                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{formData.quantityPerPackage || 1} {selectedSubPackage?.name || selectedUnit?.name || 'un.'}</span>
                              </div>
                            )}
                            {selectedSubPackage && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">1 {selectedSubPackage.name}</span>
                                <span>=</span>
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{formData.quantityPerSubPackage || 1} {selectedUnit?.name || 'un.'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Errores de validación */}
                    {packagingErrors.length > 0 && (
                      <div className="p-2 bg-red-50 rounded border border-red-200 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          {packagingErrors.map((err, i) => (
                            <p key={i} className="text-[9px] font-bold text-red-600">{err}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Peso y Volumen */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Peso Estimado (kg)</label>
                        <input 
                          type="number" 
                          step="0.0001" 
                          min="0" 
                          value={formData.weight || ''} 
                          onChange={e => setFormData({...formData, weight: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center bg-white text-slate-800 focus:border-blue-500 outline-none" 
                          placeholder="0.0000" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Volumen Estimado (m³)</label>
                        <input 
                          type="number" 
                          step="0.0001" 
                          min="0" 
                          value={formData.volume || ''} 
                          onChange={e => setFormData({...formData, volume: e.target.value})} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center bg-white text-slate-800 focus:border-blue-500 outline-none" 
                          placeholder="0.0000" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección 3: Descripción y Características */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-600" /> Descripción General
                        </label>
                        <textarea 
                          rows={3} 
                          value={formData.description || ''} 
                          onChange={e => setFormData({...formData, description: e.target.value})} 
                          className="w-full p-2 border border-slate-300 rounded text-xs font-medium focus:border-blue-500 outline-none resize-y" 
                          placeholder="Detalles del producto..." 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" /> Ficha Técnica / Características
                        </label>
                        <textarea 
                          rows={3} 
                          value={formData.features || ''} 
                          onChange={e => setFormData({...formData, features: e.target.value})} 
                          className="w-full p-2 border border-slate-300 rounded text-xs font-medium focus:border-blue-500 outline-none resize-y" 
                          placeholder="- Material: PVC&#10;- Color: Azul" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Imagen, Precios y Parámetros */}
                <div className="lg:col-span-4 space-y-2.5">
                  
                  {/* Tarjeta Imagen */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Imagen del Producto</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-28 h-28 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center relative group">
                        {(formData.images && formData.images.length > 0) || formData.image ? (
                          <>
                            <img src={formData.images?.[0] || formData.image} alt="Preview" className="w-full h-full object-contain" />
                            <button 
                              type="button" 
                              onClick={() => setFormData({...formData, images: [], image: ''})} 
                              className="absolute inset-0 bg-red-600/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              title="Eliminar Imagen"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                      </div>

                      <label className="w-full h-7 bg-slate-100 border border-slate-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-[10px] font-bold uppercase shadow-2xs">
                        <Upload className="w-3 h-3" /> Subir Imagen
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              try {
                                setLoading(true);
                                const url = await handleFileUpload(e.target.files[0]);
                                setFormData({...formData, images: [url]});
                              } catch (err: any) {
                                console.error("Upload error:", err);
                                const errorMsg = err.response?.data?.error || err.message || "Error al subir";
                                alert(`Error: ${errorMsg}`);
                              } finally {
                                setLoading(false);
                              }
                            }
                          }} 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Tarjeta Precios */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Precios y Rentabilidad</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Costo Unit. (S/)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={formData.costPrice || ''} 
                          onChange={e => {
                            const cost = parseFloat(e.target.value) || 0;
                            const margin = parseFloat(formData.profitMargin) || 0;
                            const suggested = cost * (1 + margin / 100);
                            setFormData({...formData, costPrice: e.target.value, salePrice: suggested.toFixed(2)});
                          }} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-right bg-blue-50/50 text-blue-900 focus:border-blue-500 outline-none" 
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Margen (%)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={formData.profitMargin || ''} 
                          onChange={e => {
                            const margin = parseFloat(e.target.value) || 0;
                            const cost = parseFloat(formData.costPrice) || 0;
                            const suggested = cost * (1 + margin / 100);
                            setFormData({...formData, profitMargin: e.target.value, salePrice: suggested.toFixed(2)});
                          }} 
                          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-right bg-white text-slate-800 focus:border-blue-500 outline-none" 
                          placeholder="0.0%"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-800 uppercase">Precio Venta Público (S/)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.salePrice || ''} 
                        onChange={e => setFormData({...formData, salePrice: e.target.value})} 
                        className="h-8 w-full border border-emerald-400 rounded px-2.5 text-xs font-black text-right bg-emerald-50 text-emerald-800 focus:border-emerald-600 outline-none" 
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Tarjeta Flags de Configuración */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, isActive: !formData.isActive})} 
                        className={`h-7 rounded flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          formData.isActive !== false ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Power className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Activo</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, showInWeb: !formData.showInWeb})} 
                        className={`h-7 rounded flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          formData.showInWeb ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Globe className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Web</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, manageLots: !formData.manageLots})} 
                        className={`h-7 rounded flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          formData.manageLots ? 'bg-amber-600 border-amber-600 text-white font-bold' : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Package className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Lotes</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, useExpiryDate: !formData.useExpiryDate})} 
                        className={`h-7 rounded flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          formData.useExpiryDate ? 'bg-purple-600 border-purple-600 text-white font-bold' : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">Vence</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, isOnSale: !formData.isOnSale, discountPercent: formData.isOnSale ? '' : formData.discountPercent})} 
                        className={`col-span-2 h-7 rounded flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                          formData.isOnSale ? 'bg-red-600 border-red-600 text-white font-bold animate-pulse' : 'bg-white border-slate-300 text-slate-400'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> <span className="text-[9px] uppercase font-bold">En Oferta</span>
                      </button>
                    </div>

                    {formData.isOnSale && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <label className="text-[9px] font-bold text-red-600 uppercase whitespace-nowrap">% Dcto:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="15"
                          value={formData.discountPercent || ''}
                          onChange={e => setFormData({...formData, discountPercent: e.target.value})}
                          className="h-7 w-full border border-red-300 rounded px-2 text-xs font-black text-right bg-red-50 text-red-700 focus:ring-1 focus:ring-red-300 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Compacto */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
              </button>

              <button 
                type="button" 
                onClick={onSubmit}
                disabled={loading}
                className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {loading ? 'Guardando...' : (editingItem ? 'Actualizar Producto' : 'Guardar Producto')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
