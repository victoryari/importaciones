import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck as ShieldCheckIcon, 
  Plus as PlusIcon, 
  Pencil as PencilIcon, 
  X as XMarkIcon,
  Check as CheckIcon,
  Save,
  RefreshCw
} from 'lucide-react';

interface Role {
  id: number;
  name: string;
  permissions: string;
  isActive: boolean;
  _count?: { users: number };
}

const AVAILABLE_PERMISSIONS = [
  { id: 'ALL', label: 'Acceso Total (SuperAdmin)' },
  { id: 'VIEW_DASHBOARD', label: 'Ver Panel Principal' },
  { id: 'VIEW_PRODUCTS', label: 'Ver Productos / Catálogo' },
  { id: 'WRITE_PRODUCTS', label: 'Gestionar Productos' },
  { id: 'VIEW_INVENTORY', label: 'Ver Inventario / Stock' },
  { id: 'WRITE_INVENTORY', label: 'Modificar Inventario' },
  { id: 'VIEW_QUOTATIONS', label: 'Ver Cotizaciones' },
  { id: 'WRITE_QUOTATIONS', label: 'Crear/Editar Cotizaciones' },
  { id: 'VIEW_ORDERS', label: 'Ver Pedidos' },
  { id: 'WRITE_ORDERS', label: 'Crear/Editar Pedidos' },
  { id: 'VIEW_PURCHASES', label: 'Ver Compras' },
  { id: 'WRITE_PURCHASES', label: 'Crear/Editar Compras' },
  { id: 'VIEW_CUSTOMERS', label: 'Ver Clientes' },
  { id: 'WRITE_CUSTOMERS', label: 'Gestionar Clientes' },
  { id: 'VIEW_SUPPLIERS', label: 'Ver Proveedores' },
  { id: 'WRITE_SUPPLIERS', label: 'Gestionar Proveedores' },
  { id: 'VIEW_WAREHOUSES', label: 'Ver Almacenes / Sedes' },
  { id: 'WRITE_WAREHOUSES', label: 'Gestionar Almacenes' },
  { id: 'VIEW_SELLERS', label: 'Ver Vendedores' },
  { id: 'WRITE_SELLERS', label: 'Gestionar Vendedores' },
  { id: 'VIEW_EXCHANGE_RATES', label: 'Ver T. Cambio' },
  { id: 'WRITE_EXCHANGE_RATES', label: 'Gestionar T. Cambio' },
  { id: 'VIEW_SERIES', label: 'Ver Series' },
  { id: 'WRITE_SERIES', label: 'Gestionar Series' },
  { id: 'VIEW_LOGISTICS', label: 'Ver Logística' },
  { id: 'WRITE_LOGISTICS', label: 'Gestionar Logística' },
  { id: 'VIEW_SETTINGS', label: 'Configuración del Sistema' },
  { id: 'VIEW_PICKING', label: 'Ver Picking / Almacén' },
  { id: 'WRITE_PICKING', label: 'Gestionar Picking / Almacén' },
];

export const RoleModule = () => {
  const { token, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    permissions: [] as string[]
  });

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRoles(await res.json());
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      let parsedPerms: string[] = [];
      try { parsedPerms = JSON.parse(role.permissions); } catch (e) {}
      setFormData({
        name: role.name,
        isActive: role.isActive,
        permissions: parsedPerms
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', isActive: true, permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.toUpperCase(),
          isActive: formData.isActive,
          permissions: JSON.stringify(formData.permissions)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchRoles();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar el rol');
      }
    } catch (error) {
      alert('Error de red al guardar el rol');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('ALL')) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver este módulo.</div>;
  }

  return (
    <div className="relative p-3 space-y-2.5">
      {/* Barra Superior */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-800 rounded">
            <ShieldCheckIcon className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              Roles y Permisos de Usuarios
            </h1>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Definición de privilegios y accesos por perfil</p>
          </div>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="h-8 flex items-center gap-1.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold px-3.5 rounded text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Nuevo Rol
        </button>
      </div>

      {/* Tabla de Roles */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-600">
              <th className="px-4 py-2.5">Perfil / Nombre del Rol</th>
              <th className="px-4 py-2.5">Usuarios Asignados</th>
              <th className="px-4 py-2.5 text-center">Estado</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                    {role.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-slate-600 text-xs">{role._count?.users || 0} usuario(s)</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {role.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button 
                    onClick={() => handleOpenModal(role)}
                    className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title="Editar Rol"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Crear / Editar Rol */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-3 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.97, y: 10 }} 
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
            >
              {/* Header Compacto ERP */}
              <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/10 rounded">
                    <ShieldCheckIcon className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {editingRole ? 'Editar Rol y Permisos' : 'Registro de Nuevo Rol'}
                    </h2>
                    <p className="text-[9px] text-blue-200 uppercase font-medium">Matriz de Privilegios del Sistema</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <form 
                onSubmit={handleSubmit} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                    e.preventDefault();
                  }
                }}
                className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70"
              >
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre del Rol</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded px-2.5 text-xs font-bold uppercase text-blue-900 focus:border-blue-500 outline-none bg-white"
                        placeholder="Ej. VENDEDOR / LOGÍSTICA"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Estado</label>
                      <select 
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                        className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="true">ACTIVO</option>
                        <option value="false">INACTIVO</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <label className="text-[10px] font-bold text-blue-950 uppercase border-b border-slate-100 pb-1 flex justify-between items-center">
                    <span>Permisos de Módulos y Operaciones</span>
                    <span className="text-[9px] text-blue-700 font-bold">{formData.permissions.length} Seleccionados</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto p-1">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <label 
                        key={perm.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                          formData.permissions.includes(perm.id) 
                            ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold shadow-2xs' 
                            : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          formData.permissions.includes(perm.id)
                            ? 'bg-[#004A99] border-[#004A99] text-white'
                            : 'bg-white border-slate-300'
                        }`}>
                          {formData.permissions.includes(perm.id) && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                        />
                        <span className="text-xs leading-tight">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Compacto */}
                <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0 rounded-b-lg">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5 text-red-500" /> Cancelar
                  </button>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="h-8 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {loading ? 'Guardando...' : (editingRole ? 'Actualizar Rol' : 'Guardar Rol')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
