import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface BankAccountItem {
  id: number;
  bankName: string;
  accountNumber: string;
  cci?: string | null;
  currency: string;
  holder?: string | null;
  isActive: boolean;
}

interface BankAccountModuleProps {
  token: string | null;
}

export const BankAccountModule: React.FC<BankAccountModuleProps> = ({ token }) => {
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BankAccountItem | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    cci: '',
    currency: 'PEN',
    holder: '',
    isActive: true,
  });
  const [errorMsg, setErrorMsg] = useState('');

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/bank-accounts');
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar cuentas bancarias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      bankName: '',
      accountNumber: '',
      cci: '',
      currency: 'PEN',
      holder: '',
      isActive: true,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: BankAccountItem) => {
    setEditingItem(item);
    setFormData({
      bankName: item.bankName,
      accountNumber: item.accountNumber,
      cci: item.cci || '',
      currency: item.currency || 'PEN',
      holder: item.holder || '',
      isActive: item.isActive,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName.trim() || !formData.accountNumber.trim()) {
      setErrorMsg('El banco y el número de cuenta son obligatorios.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      if (editingItem) {
        await axios.put(`/api/bank-accounts/${editingItem.id}`, formData, authConfig);
      } else {
        await axios.post('/api/bank-accounts', formData, authConfig);
      }
      setIsModalOpen(false);
      await fetchAccounts();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al guardar cuenta bancaria.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: BankAccountItem) => {
    try {
      await axios.put(`/api/bank-accounts/${item.id}`, { isActive: !item.isActive }, authConfig);
      await fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al cambiar estado.');
    }
  };

  const handleDelete = async (item: BankAccountItem) => {
    if (!window.confirm(`¿Eliminar la cuenta "${item.bankName} - ${item.accountNumber}"?`)) return;
    try {
      await axios.delete(`/api/bank-accounts/${item.id}`, authConfig);
      await fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar cuenta bancaria.');
    }
  };

  const filtered = accounts.filter(
    (a) =>
      a.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.cci || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.holder || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl border border-blue-100">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Bancos y Cuentas Bancarias</h2>
            <p className="text-xs text-slate-500">Gestiona los bancos y cuentas disponibles para abonos, depósitos y transferencias.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar banco o cuenta..."
              className="h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-[#004A99] w-52"
            />
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="h-9 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Banco</th>
                <th className="py-3 px-4">Nro. de Cuenta</th>
                <th className="py-3 px-4">CCI</th>
                <th className="py-3 px-4 w-24 text-center">Moneda</th>
                <th className="py-3 px-4">Titular</th>
                <th className="py-3 px-4 w-28 text-center">Estado</th>
                <th className="py-3 px-4 w-28 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                    Cargando cuentas bancarias...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No se encontraron cuentas bancarias.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 uppercase">{item.bankName}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#004A99]">{item.accountNumber}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{item.cci || '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.currency === 'USD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {item.currency === 'USD' ? 'USD ($)' : 'PEN (S/)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 uppercase">{item.holder || '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
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
              className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
            >
              <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/10 rounded">
                    <Landmark className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-tight">
                      {editingItem ? 'Editar Cuenta Bancaria' : 'Registro de Nueva Cuenta Bancaria'}
                    </h2>
                    <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de Cobros y Tesorería</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
                      Datos del Banco y Cuenta
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Banco *</label>
                      <input
                        type="text"
                        required
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Ej: BCP, BBVA, INTERBANK"
                        className="h-8 w-full px-2.5 rounded border border-slate-300 text-xs font-bold text-slate-800 uppercase outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Moneda *</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-white"
                      >
                        <option value="PEN">SOLES (S/)</option>
                        <option value="USD">DÓLARES ($)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Nro. de Cuenta *</label>
                      <input
                        type="text"
                        required
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="Ej: 191-1482686-0-24"
                        className="h-8 w-full px-2.5 rounded border border-slate-300 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">CCI (Opcional)</label>
                      <input
                        type="text"
                        value={formData.cci}
                        onChange={(e) => setFormData({ ...formData, cci: e.target.value })}
                        placeholder="Ej: 002-191-001482686024-50"
                        className="h-8 w-full px-2.5 rounded border border-slate-300 text-xs font-mono text-slate-800 outline-none focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Titular de la Cuenta (Opcional)</label>
                    <input
                      type="text"
                      value={formData.holder}
                      onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
                      placeholder="Ej: IMPORTACIONES CARMELITA DEL NORTE"
                      className="h-8 w-full px-2.5 rounded border border-slate-300 text-xs font-medium text-slate-800 uppercase outline-none focus:border-blue-600 bg-white"
                    />
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <input
                      id="ba-active"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#004A99] rounded border-slate-300"
                    />
                    <label htmlFor="ba-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Cuenta activa (disponible en cobros)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-8 px-4 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
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
