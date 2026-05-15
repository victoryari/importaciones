import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users as UsersIcon, 
  Plus as PlusIcon, 
  Pencil as PencilIcon, 
  Key as KeyIcon,
  X as XMarkIcon
} from 'lucide-react';

interface Role {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  roleId: number | null;
  role?: { name: string };
  createdAt: string;
}

export const UserModule = () => {
  const { token, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    isActive: true
  });

  const fetchData = async () => {
    try {
      const [resUsers, resRoles] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resRoles.ok) {
        const allRoles = await resRoles.json();
        setRoles(allRoles.filter((r: any) => r.isActive));
      }
    } catch (error) {
      console.error('Error fetching users/roles:', error);
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
        password: '', // Blank password unless changing
        roleId: user.roleId?.toString() || '',
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', roleId: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && !formData.password) {
      alert('La contraseña es requerida para nuevos usuarios');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
            <UsersIcon className="w-8 h-8 text-blue-600" />
            Cuentas de Usuario
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Administra los accesos de los trabajadores
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Nombre</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Rol Asignado</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{user.name || 'Sin Nombre'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  {user.role ? (
                    <span className="font-black text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-200">{user.role.name}</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">SIN ROL</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 text-xs font-black rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'ACTIVO' : 'BLOQUEADO'}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button 
                    onClick={() => handleOpenModal(user)}
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800">
                {editingUser ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Correo (Login)</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all lowercase"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <KeyIcon className="w-4 h-4" /> 
                  Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rol de Acceso</label>
                  <select 
                    value={formData.roleId}
                    onChange={e => setFormData({...formData, roleId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white outline-none"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Estado</label>
                  <select 
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:bg-white outline-none"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Bloqueado</option>
                  </select>
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
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
