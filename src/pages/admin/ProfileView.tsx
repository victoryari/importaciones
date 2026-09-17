import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, KeyRound, ShieldCheck, Building2, 
  Warehouse, Eye, EyeOff, Save, CheckCircle2, 
  AlertCircle, Lock, Sparkles, Bell, Sliders, Laptop, Calendar
} from 'lucide-react';
import axios from 'axios';

interface ProfileViewProps {
  user: any;
  token: string | null;
  onUserUpdate: (updatedUser: any) => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  token,
  onUserUpdate,
  showSuccess,
  showError
}) => {
  // Formulario de datos personales
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Formulario de cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Guardar datos de perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim() || !profileData.email.trim()) {
      showError('Por favor complete todos los campos obligatorios');
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await axios.put('/api/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.user) {
        onUserUpdate(res.data.user);
        showSuccess('Información personal actualizada correctamente');
      }
    } catch (err: any) {
      console.error(err);
      showError(err.response?.data?.error || 'Error al actualizar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Guardar nueva contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError('Por favor complete todos los campos de contraseña');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('La confirmación de la nueva contraseña no coincide');
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await axios.put('/api/auth/change-password', passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(res.data.message || 'Contraseña actualizada con éxito');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error(err);
      showError(err.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setLoadingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Cálculo de fuerza de contraseña
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const pwdStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className="space-y-4 pb-12 max-w-6xl mx-auto">
      {/* --- TARJETA HERO DE PERFIL --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-linear-to-bl from-blue-50/60 to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
          {/* Avatar con Insignia */}
          <div className="relative shrink-0">
            <div className="w-18 h-18 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20 border-2 border-white">
              {getInitials(user?.name || '')}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-xs" title="Sesión Activa">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          {/* Información Principal */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {user?.name || 'Usuario del Sistema'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                {user?.role || 'USUARIO'}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email || 'Sin correo asignado'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {user?.warehouse && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                  {typeof user.warehouse === 'object' ? user.warehouse.name : user.warehouse}
                </span>
              )}
              {user?.series && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  Serie: {user.series}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- GRID DE 2 COLUMNAS: DATOS PERSONALES & SEGURIDAD --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUMNA IZQUIERDA: DATOS PERSONALES (6 COLS) */}
        <div className="lg:col-span-6 space-y-4">
          <fieldset className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <legend className="text-[11px] font-bold text-blue-700 px-2 uppercase tracking-tight flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Información Personal
            </legend>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Nombres y Apellidos <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={profileData.name}
                    onChange={e => setProfileData({...profileData, name: e.target.value})}
                    className="h-9 w-full border border-slate-300 rounded-lg pl-8 pr-3 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={profileData.email}
                    onChange={e => setProfileData({...profileData, email: e.target.value})}
                    className="h-9 w-full border border-slate-300 rounded-lg pl-8 pr-3 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Utilizado para iniciar sesión en la plataforma.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loadingProfile}
                  className="px-5 h-9 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-900/10 flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {loadingProfile ? 'Guardando...' : 'Guardar Información'}
                </button>
              </div>
            </form>
          </fieldset>

          {/* INFORMACIÓN DEL SISTEMA Y ASIGNACIONES */}
          <fieldset className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <legend className="text-[11px] font-bold text-blue-700 px-2 uppercase tracking-tight flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Asignaciones del Sistema
            </legend>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rol en Plataforma</span>
                <span className="font-extrabold text-slate-800 block text-xs">{user?.role || 'USUARIO REGULAR'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Almacén Asignado</span>
                <span className="font-extrabold text-slate-800 block text-xs truncate">
                  {user?.warehouse ? (typeof user.warehouse === 'object' ? user.warehouse.name : user.warehouse) : 'No asignado'}
                </span>
              </div>
            </div>

            {user?.permissions && user.permissions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Permisos Activos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((perm: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        </div>

        {/* COLUMNA DERECHA: SEGURIDAD Y CAMBIO DE CONTRASEÑA (6 COLS) */}
        <div className="lg:col-span-6 space-y-4">
          <fieldset className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <legend className="text-[11px] font-bold text-blue-700 px-2 uppercase tracking-tight flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Seguridad & Cambio de Contraseña
            </legend>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {/* Contraseña Actual */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Contraseña Actual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    required
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="h-9 w-full border border-slate-300 rounded-lg pl-8 pr-9 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ingrese su contraseña actual"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Nueva Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    required
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="h-9 w-full border border-slate-300 rounded-lg pl-8 pr-9 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Barra de fortaleza */}
                {passwordData.newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          pwdStrength <= 25 ? 'bg-red-500 w-1/4' :
                          pwdStrength <= 50 ? 'bg-amber-500 w-2/4' :
                          pwdStrength <= 75 ? 'bg-blue-500 w-3/4' : 'bg-emerald-500 w-full'
                        }`} 
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pwdStrength <= 25 && '🔴 Contraseña débil'}
                      {pwdStrength === 50 && '🟡 Contraseña regular'}
                      {pwdStrength === 75 && '🔵 Contraseña buena'}
                      {pwdStrength === 100 && '🟢 Contraseña muy segura'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Confirmar Nueva Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    required
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className={`h-9 w-full border rounded-lg pl-8 pr-9 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                      passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                    }`}
                    placeholder="Repita la nueva contraseña"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <span className="text-[10px] font-bold text-red-500 block">
                    Las contraseñas no coinciden
                  </span>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loadingPassword || (passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword)}
                  className="px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md shadow-emerald-900/10 flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {loadingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </fieldset>

          {/* MÓDULO PREPARADO PARA FUTURAS CONFIGURACIONES */}
          <fieldset className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <legend className="text-[11px] font-bold text-slate-600 px-2 uppercase tracking-tight flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" /> Preferencias & Acciones Futuras
            </legend>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Notificaciones de Ventas y Stock</span>
                    <span className="text-[10px] text-slate-400 block">Alertas sonoras y visuales para nuevos pedidos</span>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 border-slate-300" />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Modo Teclado ERP (Atajos rápidos F1 - F9)</span>
                    <span className="text-[10px] text-slate-400 block">Activar navegación ultrarrápida por teclado</span>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-indigo-600 border-slate-300" />
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};
