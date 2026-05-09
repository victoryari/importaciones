import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Search, PlusCircle, Edit2, Trash2, Phone, 
  Mail, MapPin, Building2, Globe, MessageCircle, 
  ExternalLink, CreditCard, ShieldCheck, Filter
} from 'lucide-react';

interface Customer {
  id: number;
  code?: string;
  name: string;
  personType: string;
  docType: string;
  docNumber: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  phone?: string;
  email?: string;
  department?: string;
  province?: string;
  district?: string;
  country: string;
}

interface CustomerModuleProps {
  customers: Customer[];
  onDelete: (id: number) => void;
  onEdit: (customer: Customer) => void;
  onNew: () => void;
  departments: any[];
}

export const CustomerModule: React.FC<CustomerModuleProps> = ({
  customers,
  onDelete,
  onEdit,
  onNew,
  departments
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.docNumber.includes(searchTerm) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre, documento o celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        <button 
          onClick={onNew}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
        >
          <PlusCircle className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><User className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clientes</p><p className="text-lg font-black text-slate-900">{customers.length}</p></div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Naturales</p><p className="text-lg font-black text-slate-900">{customers.filter(c => c.personType === 'NATURAL').length}</p></div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurídicos</p><p className="text-lg font-black text-slate-900">{customers.filter(c => c.personType === 'JURIDICA').length}</p></div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Globe className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extranjeros</p><p className="text-lg font-black text-slate-900">{customers.filter(c => c.country !== 'PERU').length}</p></div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Cliente / Documento</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Contacto</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ubicación</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Código</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 leading-tight">{customer.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{customer.docType}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{customer.docNumber}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone className="w-3 h-3 text-slate-300" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-300" />
                      <span>
                        {(() => {
                          const dept = departments.find(d => d.id === customer.department || d.name === customer.department);
                          return dept?.name || customer.department || 'Sin ubicación';
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase">
                      {customer.code || 'S/C'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => window.open(`https://wa.me/${customer.phone}`, '_blank')}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(customer)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(customer.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
