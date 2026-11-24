import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Mail, Phone, MapPin, X, Save, Search, 
  Building2, UserCheck, CreditCard, RefreshCw, Users, Plus, Trash2 
} from 'lucide-react';
import { DEPARTMENTS, PROVINCES, DISTRICTS, normalizeUbigeoString } from '../../../lib/ubigeoData';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  documentTypes: any[];
  handleConsultDocument: () => Promise<void>;
  customers?: any[];
  token?: string | null;
  onAssociationChange?: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, handleConsultDocument, customers = [], token, onAssociationChange
}) => {
  const [isConsulting, setIsConsulting] = useState(false);
  const [assocSearch, setAssocSearch] = useState('');
  const [assocRelationship, setAssocRelationship] = useState('REPRESENTANTE');
  const [assocLoading, setAssocLoading] = useState(false);
  const [localAssociations, setLocalAssociations] = useState<any[]>([]);

  useEffect(() => {
    setLocalAssociations(editingItem?.associatedCustomers || formData?.associatedCustomers || []);
    setAssocSearch('');
  }, [editingItem, isOpen]);

  const availableToAssociate = customers.filter(c => {
    if (c.id === editingItem?.id) return false;
    if (localAssociations.some(a => a.id === c.id)) return false;
    const term = assocSearch.trim().toLowerCase();
    if (!term) return false;
    return c.name?.toLowerCase().includes(term) || c.docNumber?.includes(term);
  }).slice(0, 6);

  const handleAddAssociation = async (targetCustomer: any) => {
    if (!editingItem?.id || !token) return;
    setAssocLoading(true);
    try {
      const res = await axios.post(
        `/api/customers/${editingItem.id}/associations`,
        { relatedCustomerId: targetCustomer.id, relationship: assocRelationship },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLocalAssociations(prev => [...prev, res.data]);
      setAssocSearch('');
      if (onAssociationChange) onAssociationChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al asociar cliente');
    } finally {
      setAssocLoading(false);
    }
  };

  const handleRemoveAssociation = async (relatedId: number) => {
    if (!editingItem?.id || !token) return;
    setAssocLoading(true);
    try {
      await axios.delete(`/api/customers/${editingItem.id}/associations/${relatedId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocalAssociations(prev => prev.filter(a => a.id !== relatedId));
      if (onAssociationChange) onAssociationChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al desvincular cliente');
    } finally {
      setAssocLoading(false);
    }
  };

  const onConsult = async () => {
    if (!formData.docNumber) return;
    setIsConsulting(true);
    try {
      await handleConsultDocument();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConsulting(false);
    }
  };

  // Lógica de Auto-detección inteligente
  useEffect(() => {
    const num = formData.docNumber || '';
    if (num.length === 11) {
      if (num.startsWith('20')) {
        setFormData((prev: any) => ({ ...prev, personType: 'JURIDICA', docType: 'RUC' }));
      } else if (num.startsWith('10')) {
        setFormData((prev: any) => ({ ...prev, personType: 'NATURAL', docType: 'RUC' }));
      }
    } else if (num.length === 8) {
      setFormData((prev: any) => ({ ...prev, personType: 'NATURAL', docType: 'DNI' }));
    }
  }, [formData.docNumber]);

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
      <div className="absolute inset-0 z-[130] flex items-center justify-center p-3 overflow-hidden">
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
                  {editingItem ? 'Editar Cliente' : 'Registro de Nuevo Cliente'}
                </h2>
                <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de Administración de Terceros</p>
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
            {/* Sección 1: Identidad */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información de Identidad</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo de Persona</label>
                  <select 
                    value={formData.personType || 'NATURAL'} 
                    onChange={e => setFormData({...formData, personType: e.target.value})}
                    className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                  >
                    <option value="NATURAL">PERSONA NATURAL</option>
                    <option value="JURIDICA">PERSONA JURÍDICA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo de Documento</label>
                  <select 
                    value={formData.docType === '1' ? 'DNI' : formData.docType === '6' ? 'RUC' : formData.docType === '4' ? 'CE' : formData.docType === '7' ? 'PAS' : (formData.docType || 'DNI')} 
                    onChange={e => setFormData({...formData, docType: e.target.value})}
                    className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none uppercase"
                  >
                    <option value="DNI">1 - DNI (DOC. NACIONAL DE IDENTIDAD)</option>
                    <option value="RUC">6 - RUC (REGISTRO ÚNICO DE CONTRIBUYENTES)</option>
                    <option value="CE">4 - CARNET DE EXTRANJERÍA</option>
                    <option value="PAS">7 - PASAPORTE</option>
                    <option value="OTROS">0 - OTROS TIPOS DE DOCUMENTOS</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Número de Documento</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.docNumber || ''} 
                      onChange={e => setFormData({...formData, docNumber: e.target.value})}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onConsult(); } }}
                      className="w-full h-8 pl-7 pr-20 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none"
                      placeholder="Número de documento..."
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button 
                      type="button" 
                      onClick={onConsult}
                      disabled={isConsulting || !formData.docNumber}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-blue-800 disabled:opacity-40 transition-colors cursor-pointer"
                      title="Consultar en SUNAT / RENIEC"
                    >
                      {isConsulting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      {isConsulting ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Datos Personales / Empresa */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">Información General</span>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">
                    {formData.docType === 'RUC' ? 'Razón Social' : 'Nombre Completo / Razón Social'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none"
                    placeholder="Nombre completo o razón social..."
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
                        placeholder="cliente@correo.com"
                      />
                      <Mail className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
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
                      onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})}
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

            {/* SECCIÓN 4: CLIENTES ASOCIADOS (RUC / DNI) */}
            {editingItem?.id && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#004A99]" />
                    <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider">
                      Clientes Asociados (RUC / DNI Vinculados)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {localAssociations.length} vinculado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={assocSearch}
                      onChange={e => setAssocSearch(e.target.value)}
                      placeholder="Buscar cliente por RUC/DNI o nombre para asociar..."
                      className="h-8 w-full pl-8 pr-2.5 border border-slate-300 rounded text-xs outline-none focus:border-[#004A99]"
                    />
                  </div>
                  <select
                    value={assocRelationship}
                    onChange={e => setAssocRelationship(e.target.value)}
                    className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-[#004A99]"
                  >
                    <option value="REPRESENTANTE">REPRESENTANTE</option>
                    <option value="COMPRADOR">COMPRADOR</option>
                    <option value="SOCIO">SOCIO</option>
                    <option value="EMPRESA VINCULADA">EMPRESA VINCULADA</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>

                {availableToAssociate.length > 0 && (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-lg divide-y divide-blue-100 max-h-36 overflow-y-auto">
                    {availableToAssociate.map(c => (
                      <div key={c.id} className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] font-bold text-[#004A99] mr-2">{c.docNumber}</span>
                          <span className="text-xs font-semibold text-slate-800 uppercase truncate">{c.name}</span>
                        </div>
                        <button
                          type="button"
                          disabled={assocLoading}
                          onClick={() => handleAddAssociation(c)}
                          className="h-7 px-2.5 bg-[#004A99] hover:bg-[#003B7A] text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" /> Asociar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {localAssociations.length > 0 ? (
                  <div className="space-y-1.5">
                    {localAssociations.map(assoc => (
                      <div key={assoc.id} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-slate-800">
                              {assoc.docType}: {assoc.docNumber}
                            </span>
                            {assoc.relationship && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase">
                                {assoc.relationship}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-700 uppercase truncate">{assoc.name}</p>
                        </div>
                        <button
                          type="button"
                          disabled={assocLoading}
                          onClick={() => handleRemoveAssociation(assoc.id)}
                          title="Desvincular cliente"
                          aria-label="Desvincular cliente"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No tiene otros RUC / DNI asociados.</p>
                )}
              </div>
            )}
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
              {loading ? 'Guardando...' : (editingItem ? 'Actualizar Cliente' : 'Guardar Cliente')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
