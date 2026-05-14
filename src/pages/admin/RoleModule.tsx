import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck as ShieldCheckIcon, 
  Plus as PlusIcon, 
  Pencil as PencilIcon, 
  X as XMarkIcon,
  Check as CheckIcon
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
];

export const RoleModule = () => {
  const { token, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
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
    }
  };

  if (!hasPermission('ALL')) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver este módulo.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            Roles y Permisos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestiona los niveles de acceso al sistema
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Rol
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Rol</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Usuarios</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-sm">{role.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-600">{role._count?.users || 0} usuarios</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 text-xs font-black rounded-full ${role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {role.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button 
                    onClick={() => handleOpenModal(role)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800">
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre del Rol</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase"
                    placeholder="Ej. VENDEDOR JUNIOR"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Estado</label>
                  <select 
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white outline-none"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Permisos del Sistema</label>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label 
                      key={perm.id} 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.permissions.includes(perm.id) 
                          ? 'bg-blue-50 border-blue-200 text-blue-800' 
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border ${
                        formData.permissions.includes(perm.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}>
                        {formData.permissions.includes(perm.id) && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                      />
                      <div className="text-sm font-bold leading-tight">{perm.label}</div>
                    </label>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-500 active:scale-95 transition-all"
              >
                Guardar Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
