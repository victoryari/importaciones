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
                <Building2 className="w-4 h-4 text-indigo-800" />
                <h2 className="text-sm font-bold text-slate-700 tracking-tight">{editingItem ? 'Editar' : 'Nueva'} Agencia de Transporte</h2>
              </div>
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-1 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col bg-[#F0F4F8]">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                
                {/* --- SECCIÓN 1: IDENTIFICACIÓN --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-16">RUC</span>
                    <div className="flex-1 flex gap-1">
                      <input 
                        type="text" maxLength={11}
                        value={formData.ruc || ''}
                        onChange={e => setFormData({...formData, ruc: e.target.value})}
                        className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-indigo-500"
                        placeholder="20XXXXXXXXX"
                      />
                      <button 
                        type="button"
                        onClick={handleConsult}
                        disabled={localLoading || !formData.ruc || formData.ruc.length !== 11}
                        className="h-8 px-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {localLoading ? <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-8 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 w-24 text-right">Razón Social</span>
                    <input 
                      type="text" required
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 outline-none focus:border-indigo-500 bg-indigo-50/50"
                    />
                  </div>
                </div>

                {/* --- SECCIÓN 2: CONFIGURACIÓN Y CONTACTO --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0">Zona Base</span>
                    <select required value={formData.zoneId || ''} onChange={e => setFormData({...formData, zoneId: e.target.value})} className="h-8 border border-slate-300 rounded px-2 text-xs font-bold flex-1 bg-white outline-none">
                      <option value="">Seleccionar...</option>
                      {shippingZones.map(z => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0 text-right">Teléfono</span>
                    <div className="relative flex-1">
                      <Phone className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={formData.phone || ''}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-16 shrink-0 text-right">Email</span>
                    <div className="relative flex-1">
                      <Mail className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN 3: SUCURSALES --- */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Sucursales y Direcciones
                    </h4>
                  </div>

                  <div className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Dirección Sucursal</label>
                      <input type="text" placeholder="Av. Principal 123" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} className="h-8 w-full border border-slate-200 rounded px-2 text-[11px] font-bold outline-none" />
                    </div>
                    <div className="md:col-span-5">
                      <UbigeoSelector department={newBranch.department} province={newBranch.province} district={newBranch.district} onChange={(d) => setNewBranch({...newBranch, ...d})} className="bg-transparent gap-2" />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <button type="button" onClick={() => setNewBranch({...newBranch, isMain: !newBranch.isMain})} className={`h-8 px-3 rounded text-[10px] font-bold transition-all border ${newBranch.isMain ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                        {newBranch.isMain ? 'Predeterminada' : 'No Predet.'}
                      </button>
                      <button type="button" onClick={addOrUpdateBranch} className="h-8 flex-1 bg-indigo-600 text-white rounded text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-1">
                        {editingBranchIndex !== null ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {editingBranchIndex !== null ? 'Actualizar' : 'Agregar'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase">Estado</th>
                          <th className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase">Dirección</th>
                          <th className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase">Ubigeo</th>
                          <th className="px-3 py-1.5 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px]">
                        {formData.branches?.map((branch: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5">
                              {branch.isMain ? (
                                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Principal</span>
                              ) : (
                                <span className="text-slate-300 text-[8px] font-bold uppercase">Sucursal</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 font-bold text-slate-700">{branch.address}</td>
                            <td className="px-3 py-1.5 text-slate-500 text-[10px] font-bold italic">
                              {branch.department} / {branch.province} / {branch.district}
                            </td>
                            <td className="px-3 py-1.5 flex justify-end gap-1">
                              <button type="button" onClick={() => editBranch(idx)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeBranch(idx)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  className="px-8 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 disabled:bg-indigo-300 uppercase text-xs"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Procesando...' : editingItem ? 'Guardar Cambios' : 'Registrar Agencia'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
