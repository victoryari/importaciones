import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, X, Save, Search, 
  Building2, UserCheck, CreditCard, RefreshCw 
} from 'lucide-react';
import axios from 'axios';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../../../lib/ubigeoData';

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  token: string | null;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingItem,
  loading,
  token
}) => {
  const [consultLoading, setConsultLoading] = useState(false);

  const handleConsultDocument = async () => {
    if (!formData.docNumber) return;
    setConsultLoading(true);
    try {
      const res = await axios.get(`/api/consult/${formData.docType.toLowerCase()}/${formData.docNumber.trim()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const d = res.data;
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success) {
        const data = d.data || d;
        if (formData.docType === 'RUC') {
          setFormData({ 
            ...formData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: data.direccion || data.direccion_completa || '',
            department: data.departamento || '',
            province: data.provincia || '',
            district: data.distrito || ''
          });
        } else {
          const rawNames = data.nombres || '';
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';
          setFormData({ 
            ...formData, 
            name: `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: data.direccion || data.direccion_completa || ''
          });
        }
      } else {
        alert('No se encontró información');
      }
    } catch (err) { 
      console.error(err);
      alert('Error en el servicio de consulta');
    } finally { setConsultLoading(false); }
  };



  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 10 }} 
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        >
          {/* Header - Matching Customer Style */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingItem ? 'Editar Proveedor' : 'Registro de Nuevo Proveedor'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Gestión de Proveedores y Logística</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form 
            onSubmit={onSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault();
              }
            }}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
          >
            
            {/* Section 1: Identidad */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información de Identidad</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Documento</label>
                  <select 
                    value={formData.docType} 
                    onChange={e => setFormData({...formData, docType: e.target.value})}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="RUC">RUC (REGISTRO ÚNICO DE CONTRIBUYENTES)</option>
                    <option value="DNI">DNI (DOCUMENTO NACIONAL DE IDENTIDAD)</option>
                    <option value="CE">C.E. (CARNET DE EXTRANJERÍA)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Número de Documento</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.docNumber} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})}
                      className="w-full h-10 pl-10 pr-24 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                      placeholder="Ingrese el número..."
                    />
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <button 
                      type="button" 
                      onClick={handleConsultDocument}
                      disabled={consultLoading}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-sm"
                    >
                      {consultLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      {consultLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Datos Generales */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información General del Proveedor</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Razón Social / Nombre Completo</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase"
                    placeholder="Ingrese la razón social..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Teléfono / Celular</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="999 999 999"
                      />
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="ejemplo@correo.com"
                      />
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nombre de Contacto</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.contact} 
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="Persona de contacto..."
                    />
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Ubicación */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">Información de Ubicación (Ubigeo)</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Dirección Fiscal / Domicilio</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase shadow-inner"
                      placeholder="Calle, Avenida, Jirón..."
                    />
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Departamento</label>
                    <select 
                      value={DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id || ''} 
                      onChange={e => {
                        const dept = DEPARTMENTS.find(d => d.id === e.target.value);
                        setFormData({...formData, department: dept?.name || '', province: '', district: ''});
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Provincia</label>
                    <select 
                      value={(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        return deptId ? (PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id || '') : '';
                      })()}
                      onChange={e => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const prov = deptId ? PROVINCES[deptId]?.find(p => p.id === e.target.value) : null;
                        setFormData({...formData, province: prov?.name || '', district: ''});
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                      disabled={!formData.department}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        return deptId ? PROVINCES[deptId]?.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>) : [];
                      })()}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Distrito</label>
                    <select 
                      value={(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        return provId ? (DISTRICTS[provId]?.find(d => d.name.toUpperCase() === (formData.district || '').toUpperCase())?.id || '') : '';
                      })()}
                      onChange={e => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        const dist = provId ? DISTRICTS[provId]?.find(d => d.id === e.target.value) : null;
                        setFormData({...formData, district: dist?.name || ''});
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none uppercase transition-all focus:border-blue-400"
                      disabled={!formData.province}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {(() => {
                        const deptId = DEPARTMENTS.find(d => d.name.toUpperCase() === (formData.department || '').toUpperCase())?.id;
                        const provId = deptId ? PROVINCES[deptId]?.find(p => p.name.toUpperCase() === (formData.province || '').toUpperCase())?.id : null;
                        return provId ? DISTRICTS[provId]?.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>) : [];
                      })()}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-black text-slate-500 hover:text-red-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={onSubmit}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Procesando...' : (editingItem ? 'Actualizar Proveedor' : 'Guardar Proveedor')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
