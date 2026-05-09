import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Building2, Search, Phone, Mail, User, MapPin, Globe, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { UbigeoSelector } from '../../../components/UbigeoSelector';
import { getDeptId, getProvId, getDistId } from '../../../lib/ubigeoData';

interface AgencyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  shippingZones: any[];
  handleConsultDocument: (type: string, number: string) => Promise<any>;
}

export const AgencyForm: React.FC<AgencyFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingItem,
  loading,
  shippingZones,
  handleConsultDocument
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [newBranch, setNewBranch] = useState({
    address: '',
    department: '',
    province: '',
    district: '',
    contact: '',
    phone: '',
    isMain: false
  });
  const [editingBranchIndex, setEditingBranchIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewBranch({
        address: '',
        department: '',
        province: '',
        district: '',
        contact: '',
        phone: '',
        isMain: false
      });
      setEditingBranchIndex(null);
    }
  }, [isOpen]);

  const handleConsult = async () => {
    if (!formData.ruc || formData.ruc.length !== 11) {
      alert('Ingrese un RUC válido de 11 dígitos');
      return;
    }
    setLocalLoading(true);
    try {
      const data = await handleConsultDocument('RUC', formData.ruc);
      if (data) {
        const dName = data.departamento || data.department || '';
        const pName = data.provincia || data.province || '';
        const diName = data.distrito || data.district || '';
        
        const deptId = getDeptId(dName);
        const provId = getProvId(deptId, pName);
        const distId = getDistId(provId, diName);

        setFormData({
          ...formData,
          name: data.razonSocial || data.nombre_o_razon_social || formData.name,
          address: data.direccion || data.direccion_completa || formData.address,
          legalAddress: data.direccion || data.direccion_completa || formData.legalAddress,
          department: deptId,
          province: provId,
          district: distId
        });
      }
    } catch (err) {
      alert('Error al consultar RUC');
    } finally {
      setLocalLoading(false);
    }
  };

  const addOrUpdateBranch = () => {
    if (!newBranch.address) return;
    
    const updatedBranches = [...(formData.branches || [])];
    
    // If setting as main, unset other main branches
    if (newBranch.isMain) {
      updatedBranches.forEach(b => b.isMain = false);
    }

    if (editingBranchIndex !== null) {
      updatedBranches[editingBranchIndex] = newBranch;
    } else {
      updatedBranches.push(newBranch);
    }

    setFormData({ ...formData, branches: updatedBranches });
    setNewBranch({ address: '', department: '', province: '', district: '', contact: '', phone: '', isMain: false });
    setEditingBranchIndex(null);
  };

  const removeBranch = (index: number) => {
    const updatedBranches = formData.branches.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, branches: updatedBranches });
  };

  const editBranch = (index: number) => {
    setNewBranch(formData.branches[index]);
    setEditingBranchIndex(index);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {editingItem ? 'Editar Agencia' : 'Nueva Agencia de Transporte'}
                  </h2>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Maestro de Transportistas y Sucursales
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all border border-slate-100 hover:rotate-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Basic Info & RUC */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                  <h4 className="font-black text-slate-700 text-sm uppercase tracking-wider">Información de Identidad</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de RUC</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input type="text" maxLength={11} placeholder="20XXXXXXXXX" value={formData.ruc || ''} onChange={e => setFormData({...formData, ruc: e.target.value})} className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                      </div>
                      <button type="button" onClick={handleConsult} disabled={localLoading || !formData.ruc || formData.ruc.length !== 11} className="px-6 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-100">
                        {localLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                        Consultar
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                    <input type="text" required placeholder="Nombre de la empresa" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              {/* Advanced Config */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zona Base</label>
                  <select required value={formData.zoneId || ''} onChange={e => setFormData({...formData, zoneId: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all">
                    <option value="">Seleccionar zona...</option>
                    {shippingZones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Principal</label>
                  <input type="text" placeholder="999 999 999" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" placeholder="contacto@agencia.com" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" />
                </div>
              </div>

              {/* Branch Management Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                    <h4 className="font-black text-slate-700 text-sm uppercase tracking-wider">Direcciones y Sucursales</h4>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                    {formData.branches?.length || 0} Registradas
                  </div>
                </div>

                {/* Branch Entry Form */}
                <div className="p-6 bg-emerald-50/30 rounded-3xl border-2 border-dashed border-emerald-100 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección del Local</label>
                      <input type="text" placeholder="Av. Ejemplo 123 - Ciudad" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} className="w-full px-5 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                    </div>
                    <div className="flex items-end gap-4">
                      <label className="flex-1 flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-white shadow-sm cursor-pointer hover:bg-emerald-50 transition-all group">
                        <input type="checkbox" checked={newBranch.isMain} onChange={e => setNewBranch({...newBranch, isMain: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight group-hover:text-emerald-700">Dirección Predeterminada</span>
                      </label>
                      <button type="button" onClick={addOrUpdateBranch} className="h-15 px-8 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2">
                        {editingBranchIndex !== null ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {editingBranchIndex !== null ? 'Actualizar' : 'Agregar'}
                      </button>
                    </div>
                  </div>

                  <UbigeoSelector department={newBranch.department} province={newBranch.province} district={newBranch.district} onChange={(d) => setNewBranch({...newBranch, ...d})} className="bg-white/50 p-4 rounded-2xl" />
                </div>

                {/* Branch List */}
                <div className="grid grid-cols-1 gap-4">
                  {formData.branches?.map((branch: any, idx: number) => (
                    <div key={idx} className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${branch.isMain ? 'bg-indigo-50/50 border-indigo-100 shadow-sm ring-1 ring-indigo-50' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${branch.isMain ? 'bg-indigo-600 shadow-indigo-100' : 'bg-slate-100'} shadow-lg`}>
                          <MapPin className={`w-6 h-6 ${branch.isMain ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-slate-800">{branch.address}</h5>
                            {branch.isMain && <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Predeterminada</span>}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {branch.department} {branch.province ? `> ${branch.province}` : ''} {branch.district ? `> ${branch.district}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => editBranch(idx)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-5 h-5" /></button>
                        <button type="button" onClick={() => removeBranch(idx)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                  {(!formData.branches || formData.branches.length === 0) && (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                      <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400">No hay sucursales registradas para esta agencia.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
              <button onClick={onSubmit} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-4xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:bg-indigo-300">
                <Save className="w-5 h-5" />
                {editingItem ? 'Guardar Cambios' : 'Registrar Agencia'}
              </button>
              <button onClick={onClose} className="px-10 bg-white hover:bg-slate-50 text-slate-500 font-black rounded-4xl border-2 border-slate-100 transition-all">
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
