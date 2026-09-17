import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, MapPin, X, Save, Search, 
  Building2, UserCheck, CreditCard, RefreshCw 
} from 'lucide-react';
import axios from 'axios';
import { DEPARTMENTS, PROVINCES, DISTRICTS, normalizeUbigeoString, resolveUbigeoInfo } from '../../../lib/ubigeoData';

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
    const rawDoc = (formData.docNumber || '').trim();
    if (!rawDoc) {
      alert('Ingrese un número de documento para consultar');
      return;
    }

    const typeMap: Record<string, string> = { '1': 'dni', '6': 'ruc', 'DNI': 'dni', 'RUC': 'ruc', 'dni': 'dni', 'ruc': 'ruc' };
    const apiType = typeMap[formData.docType] || (rawDoc.length === 11 ? 'ruc' : 'dni');

    if (apiType === 'ruc' && rawDoc.length !== 11) {
      alert(`El RUC debe tener exactamente 11 dígitos numéricos (ingresó ${rawDoc.length} dígitos).`);
      return;
    }
    if (apiType === 'dni' && rawDoc.length !== 8) {
      alert(`El DNI debe tener exactamente 8 dígitos numéricos (ingresó ${rawDoc.length} dígitos).`);
      return;
    }

    setConsultLoading(true);
    try {
      const res = await axios.get(`/api/consult/${apiType}/${rawDoc}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const d = res.data;
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success) {
        const data = d.data || d;
        const isRuc = formData.docType === '6' || formData.docType === 'RUC';
        const ubi = resolveUbigeoInfo(data);

        if (isRuc) {
          setFormData({ 
            ...formData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: data.direccion || data.direccion_completa || '',
            department: ubi.department,
            province: ubi.province,
            district: ubi.district
          });
        } else {
          const rawNames = data.nombres || '';
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';
          setFormData({ 
            ...formData, 
            name: `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: data.direccion || data.direccion_completa || '',
            department: ubi.department,
            province: ubi.province,
            district: ubi.district
          });
        }
      } else {
        alert('No se encontró información para el documento ingresado');
      }
    } catch (err) { 
      console.error(err);
      alert('Error en el servicio de consulta');
    } finally { 
      setConsultLoading(false); 
    }
  };

  // Ubigeo selection helpers
  const selectedDeptObj = DEPARTMENTS.find(d => d.id === formData.department || normalizeUbigeoString(d.name) === normalizeUbigeoString(formData.department));
  const selectedDeptId = selectedDeptObj?.id || '';

  const provincesList = selectedDeptId && PROVINCES[selectedDeptId] ? PROVINCES[selectedDeptId] : [];
  const selectedProvObj = provincesList.find(p => p.id === formData.province || normalizeUbigeoString(p.name) === normalizeUbigeoString(formData.province));
  const selectedProvId = selectedProvObj?.id || '';

  const fullProvKey = selectedDeptId && selectedProvId ? selectedDeptId + selectedProvId : '';
  const districtsList = fullProvKey && DISTRICTS[fullProvKey] ? DISTRICTS[fullProvKey] : [];
  const selectedDistObj = districtsList.find(d => d.id === formData.district || normalizeUbigeoString(d.name) === normalizeUbigeoString(formData.district));
  const selectedDistId = selectedDistObj?.id || '';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
        >
          {/* Header Compacto ERP */}
          <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/10 rounded">
                <UserCheck className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                  {editingItem ? 'Editar Proveedor' : 'Registro de Nuevo Proveedor'}
                </h2>
                <p className="text-[9px] text-blue-200 uppercase font-medium">Gestión de Proveedores y Logística</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
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
            {/* Sección 1: Identidad */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información de Identidad</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo de Documento</label>
                  <select 
                    value={formData.docType || 'RUC'} 
                    onChange={e => setFormData({...formData, docType: e.target.value})}
                    className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                  >
                    <option value="RUC">RUC (REGISTRO ÚNICO DE CONTRIBUYENTES)</option>
                    <option value="DNI">DNI (DOC. NACIONAL DE IDENTIDAD)</option>
                    <option value="CE">C.E. (CARNET DE EXTRANJERÍA)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Número de Documento</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.docNumber || ''} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConsultDocument(); } }}
                      className="w-full h-8 pl-7 pr-20 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none"
                      placeholder="Número de doc..."
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button 
                      type="button" 
                      onClick={handleConsultDocument}
                      disabled={consultLoading || !formData.docNumber}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-blue-800 disabled:opacity-40 transition-colors cursor-pointer"
                      title="Consultar en SUNAT / RENIEC"
                    >
                      {consultLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      {consultLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Datos Generales */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información General del Proveedor</span>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Razón Social / Nombre Completo</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none"
                    placeholder="Razón social o nombre..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Teléfono / Celular</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                        placeholder="999 999 999"
                      />
                      <Phone className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Correo Electrónico</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                        placeholder="proveedor@correo.com"
                      />
                      <Mail className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre de Contacto</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.contact || ''} 
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                      className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                      placeholder="Persona de contacto / Asesor..."
                    />
                    <User className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Ubicación (Ubigeo) */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información de Ubicación (Ubigeo)</span>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Dirección Fiscal / Domicilio</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.address || ''} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full h-8 pl-7 pr-2.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 uppercase focus:border-blue-500 outline-none"
                      placeholder="Calle, Avenida, Jirón, Nro..."
                    />
                    <MapPin className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Departamento</label>
                    <select 
                      value={selectedDeptId} 
                      onChange={e => {
                        const dept = DEPARTMENTS.find(d => d.id === e.target.value);
                        setFormData({
                          ...formData, 
                          department: dept?.name ? dept.name.toUpperCase() : '', 
                          province: '', 
                          district: ''
                        });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 outline-none uppercase focus:border-blue-500"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Provincia</label>
                    <select 
                      value={selectedProvId} 
                      onChange={e => {
                        const prov = provincesList.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData, 
                          province: prov?.name ? prov.name.toUpperCase() : '', 
                          district: ''
                        });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 outline-none uppercase focus:border-blue-500 disabled:bg-slate-100"
                      disabled={!selectedDeptId}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {provincesList.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Distrito</label>
                    <select 
                      value={selectedDistId} 
                      onChange={e => {
                        const dist = districtsList.find(d => d.id === e.target.value);
                        setFormData({
                          ...formData, 
                          district: dist?.name ? dist.name.toUpperCase() : ''
                        });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 outline-none uppercase focus:border-blue-500 disabled:bg-slate-100"
                      disabled={!selectedProvId}
                    >
                      <option value="">-- SELECCIONE --</option>
                      {districtsList.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Compacto */}
          <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
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
              {loading ? 'Guardando...' : (editingItem ? 'Actualizar Proveedor' : 'Guardar Proveedor')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
