import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users as UsersIcon, 
  Plus as PlusIcon, 
  Pencil as PencilIcon, 
  Key as KeyIcon,
  X as XMarkIcon,
  Building2,
  Save,
  RefreshCw,
  Mail,
  User,
  ShieldCheck,
  Power
} from 'lucide-react';

interface Role {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
  sunatCode?: string;
}

interface UserData {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  roleId: number | null;
  role?: { name: string };
  warehouseId?: number | null;
  warehouse?: Warehouse;
  createdAt: string;
}

export const UserModule = () => {
  const { token, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    warehouseId: '',
    isActive: true
  });

  const fetchData = async () => {
    try {
      const [resUsers, resRoles, resWarehouses] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/warehouses', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resRoles.ok) {
        const allRoles = await resRoles.json();
        setRoles(allRoles.filter((r: any) => r.isActive));
      }
      if (resWarehouses.ok) {
        const allWarehouses = await resWarehouses.json();
        setWarehouses(allWarehouses.filter((w: any) => w.isActive !== false));
      }
    } catch (error) {
      console.error('Error fetching users/roles/warehouses:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '',
        roleId: user.roleId?.toString() || '',
        warehouseId: user.warehouseId?.toString() || '',
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', roleId: '', warehouseId: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && !formData.password) {
      alert('La contraseña es requerida para nuevos usuarios');
      return;
    }

    setLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar el usuario');
      }
    } catch (error) {
      alert('Error de red al guardar el usuario');
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
            <UsersIcon className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              Usuarios y Accesos del Sistema
            </h1>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Administración de credenciales, roles y sedes</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="h-8 flex items-center gap-1.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold px-3.5 rounded text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-600">
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5">Correo (Login)</th>
              <th className="px-4 py-2.5">Rol de Acceso</th>
              <th className="px-4 py-2.5">Sede / Almacén Asignado</th>
              <th className="px-4 py-2.5 text-center">Estado</th>
              <th className="px-4 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-bold text-slate-800 uppercase">{user.name || 'Sin Nombre'}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-slate-600 text-xs">{user.email}</span>
                </td>
                <td className="px-4 py-2.5">
                  {user.role ? (
                    <span className="font-bold text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                      {user.role.name}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">SIN ROL</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {user.warehouse ? (
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      [{user.warehouse.sunatCode || '0000'}] {user.warehouse.name}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">General / Multisede</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'Activo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button 
                    onClick={() => handleOpenModal(user)}
                    className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title="Editar Usuario"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Crear / Editar Usuario Contenido */}
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
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
            >
              {/* Header Compacto ERP */}
              <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/10 rounded">
                    <UsersIcon className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {editingUser ? 'Editar Cuenta de Usuario' : 'Registro de Nuevo Usuario'}
                    </h2>
                    <p className="text-[9px] text-blue-200 uppercase font-medium">Control de Autenticación y Accesos</p>
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Nombre Completo</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="h-8 w-full pl-7 pr-2.5 border border-slate-300 rounded text-xs font-bold text-blue-900 uppercase focus:border-blue-500 outline-none bg-white"
                        placeholder="Ej. Juan Pérez"
                      />
                      <User className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Correo Electrónico (Login)</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="h-8 w-full pl-7 pr-2.5 border border-slate-300 rounded text-xs font-mono font-medium text-slate-800 lowercase focus:border-blue-500 outline-none bg-white"
                        placeholder="usuario@empresa.com"
                      />
                      <Mail className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                      <span>Contraseña</span>
                      {editingUser && <span className="text-[9px] text-slate-400 font-normal italic">(En blanco = mantener actual)</span>}
                    </label>
                    <div className="relative">
                      <input 
                        type="password" 
                        required={!editingUser}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="h-8 w-full pl-7 pr-2.5 border border-slate-300 rounded text-xs font-bold text-slate-800 focus:border-blue-500 outline-none bg-white"
                        placeholder="••••••••"
                      />
                      <KeyIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Sede / Almacén por Defecto */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Sede / Almacén de Despacho Predeterminado</label>
                    <div className="relative">
                      <select 
                        value={formData.warehouseId}
                        onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                        className="h-8 w-full pl-7 pr-2 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none uppercase"
                      >
                        <option value="">-- GENERAL / MULTISEDE --</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>
                            [{w.sunatCode || '0000'}] {w.name}
                          </option>
                        ))}
                      </select>
                      <Building2 className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Rol de Acceso</label>
                      <select 
                        value={formData.roleId}
                        onChange={e => setFormData({...formData, roleId: e.target.value})}
                        className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="">-- SELECCIONAR --</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Estado</label>
                      <select 
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                        className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-slate-800 bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="true">ACTIVO</option>
                        <option value="false">BLOQUEADO</option>
                      </select>
                    </div>
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
                    {loading ? 'Guardando...' : (editingUser ? 'Actualizar Cuenta' : 'Guardar Cuenta')}
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
