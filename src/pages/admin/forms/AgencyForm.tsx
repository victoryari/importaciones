import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Building2, Search, Phone, Mail, MapPin, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';
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
    const ruc = (formData.ruc || '').trim();
    if (!ruc || ruc.length !== 11) {
      alert('Ingrese un RUC válido de 11 dígitos');
      return;
    }
    setLocalLoading(true);
    try {
      const data = await handleConsultDocument('RUC', ruc);
      if (data) {
        const dName = data.departamento || data.department || '';
        const pName = data.provincia || data.province || '';
        const diName = data.distrito || data.district || '';
        
        let deptId = '';
        let provId = '';
        let distId = '';

        if (data.ubigeo && typeof data.ubigeo === 'string' && data.ubigeo.length === 6) {
          deptId = data.ubigeo.substring(0, 2);
          provId = data.ubigeo.substring(2, 4);
          distId = data.ubigeo.substring(4, 6);
        } else {
          deptId = getDeptId(dName) || '';
          provId = getProvId(pName, deptId) || '';
          distId = getDistId(diName, deptId, provId) || '';
        }

        const rAddress = (data.direccion || data.direccion_completa || '').trim();
        const rName = (data.razonSocial || data.nombre_o_razon_social || '').trim();

        // Update branch pre-fill
        setNewBranch({
          address: rAddress,
          department: deptId,
          province: provId,
          district: distId,
          contact: '',
          phone: formData.phone || '',
          isMain: true
        });

        // Automatically populate initial branch into branches list if empty
        const existingBranches = formData.branches && formData.branches.length > 0 ? [...formData.branches] : [];
        if (rAddress && (existingBranches.length === 0 || !existingBranches.some((b: any) => b.isMain))) {
          existingBranches.unshift({
            address: rAddress,
            department: deptId,
            province: provId,
            district: distId,
            contact: '',
            phone: formData.phone || '',
            isMain: true
          });
        }

        setFormData({
          ...formData,
          name: rName || formData.name,
          address: rAddress || formData.address,
          legalAddress: rAddress || formData.legalAddress,
          department: deptId,
          province: provId,
          district: distId,
          branches: existingBranches
        });
      } else {
        alert('No se encontró información en SUNAT/ApiPeru para el RUC ingresado.');
      }
    } catch (err) {
      console.error(err);
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
        <div className="absolute inset-0 z-110 flex items-center justify-center p-3 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.98, y: 15 }} 
            className="relative w-full max-w-4xl bg-[#F8FAFC] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
          >
            {/* --- CABECERA ESTILO ERP --- */}
            <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-bold border border-blue-100">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">{editingItem ? 'Editar' : 'Nueva'} Agencia de Transporte</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                
                {/* --- SECCIÓN 1: DATOS DE LA AGENCIA --- */}
                <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2.5">
                  <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tight">Datos de la Agencia</legend>
                  
                  {/* Fila 1: RUC y Razón Social */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16 text-right shrink-0">RUC:</span>
                      <div className="relative flex-1">
                        <Building2 className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-blue-800" />
                        <input 
                          type="text" maxLength={11}
                          value={formData.ruc || ''}
                          onChange={e => setFormData({...formData, ruc: e.target.value.replace(/\D/g, '')})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConsult();
                            }
                          }}
                          className="h-8 w-full border border-slate-300 rounded pl-7 pr-8 text-xs font-bold font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="20XXXXXXXXX"
                        />
                        <button 
                          type="button"
                          onClick={handleConsult}
                          disabled={localLoading || !formData.ruc || formData.ruc.length !== 11}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Consultar RUC en ApiPeru / SUNAT"
                        >
                          {localLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-8 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-22 text-right shrink-0">Razón Social:</span>
                      <input 
                        type="text" required
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-[#D9E9FF] text-[#004A99] uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="NOMBRE O RAZÓN SOCIAL DE LA AGENCIA"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Zona Base, Teléfono y Email */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16 text-right shrink-0">Zona Base:</span>
                      <select 
                        required 
                        value={formData.zoneId || ''} 
                        onChange={e => setFormData({...formData, zoneId: e.target.value})} 
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">--Seleccionar Zona--</option>
                        {shippingZones.map(z => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16 text-right shrink-0">Teléfono:</span>
                      <div className="relative flex-1">
                        <Phone className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          value={formData.phone || ''}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Opcional..."
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-12 text-right shrink-0">Email:</span>
                      <div className="relative flex-1">
                        <Mail className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email"
                          value={formData.email || ''}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="h-8 w-full border border-slate-300 rounded pl-7 pr-2 text-xs font-bold bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="correo@agencia.com"
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* --- SECCIÓN 2: SUCURSALES Y DIRECCIONES --- */}
                <fieldset className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-3">
                  <legend className="text-[10px] font-bold text-blue-700 px-2 uppercase tracking-tight flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-600" /> Sucursales y Direcciones
                  </legend>

                  {/* Fila de Agregar / Editar Sucursal */}
                  <div className="p-2.5 bg-slate-50/90 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                    <div className="md:col-span-5 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 shrink-0">Dirección:</span>
                      <input 
                        type="text" 
                        placeholder="Av. Principal 123..." 
                        value={newBranch.address} 
                        onChange={e => setNewBranch({...newBranch, address: e.target.value})} 
                        className="h-8 flex-1 border border-slate-300 rounded px-2 text-xs font-bold bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                    
                    <div className="md:col-span-5">
                      <UbigeoSelector 
                        department={newBranch.department} 
                        province={newBranch.province} 
                        district={newBranch.district} 
                        onChange={(d) => setNewBranch({...newBranch, ...d})} 
                      />
                    </div>
                    
                    <div className="md:col-span-2 flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setNewBranch({...newBranch, isMain: !newBranch.isMain})} 
                        className={`h-8 px-2 rounded text-[11px] font-bold transition-all border shrink-0 ${newBranch.isMain ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}
                      >
                        {newBranch.isMain ? '✓ Principal' : 'Sucursal'}
                      </button>
                      <button 
                        type="button" 
                        onClick={addOrUpdateBranch} 
                        className="h-8 flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        {editingBranchIndex !== null ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {editingBranchIndex !== null ? 'Actualizar' : 'Agregar'}
                      </button>
                    </div>
                  </div>

                  {/* Tabla de Sucursales */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200">
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase">Estado</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase">Dirección</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase">Departamento / Provincia / Distrito</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase text-right w-20">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium">
                        {(!formData.branches || formData.branches.length === 0) ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 text-xs italic">
                              No hay sucursales registradas para esta agencia
                            </td>
                          </tr>
                        ) : (
                          formData.branches.map((branch: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-3 py-2">
                                {branch.isMain ? (
                                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Principal</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Sucursal</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-700">{branch.address}</td>
                              <td className="px-3 py-2 text-slate-500 text-xs">
                                {branch.department ? `${branch.department} / ${branch.province || ''} / ${branch.district || ''}` : '-'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => editBranch(idx)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => removeBranch(idx)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </fieldset>
              </div>

              {/* Botones de Acción / Footer */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 h-8 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded text-xs flex items-center gap-1.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 h-8 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs shadow-md shadow-blue-900/10 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loading ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Guardar Agencia'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

