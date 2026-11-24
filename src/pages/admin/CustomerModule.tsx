import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Search, PlusCircle, Edit2, Trash2, Phone, 
  Mail, MapPin, Building2, Globe, MessageCircle, 
  List, LayoutGrid, ChevronLeft, ChevronRight
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

export const getDocumentTypeInfo = (docType?: string) => {
  const dt = (docType || '').toString().trim().toUpperCase();
  if (dt === '1' || dt === 'DNI') return { label: 'DNI', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (dt === '6' || dt === 'RUC') return { label: 'RUC', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (dt === '4' || dt === 'CE' || dt === 'CARNET EXT.') return { label: 'C.E.', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (dt === '7' || dt === 'PAS' || dt === 'PASAPORTE') return { label: 'PASAPORTE', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (dt === '0' || dt === 'OTROS') return { label: 'OTROS', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: dt || 'DOC', color: 'bg-slate-100 text-slate-600 border-slate-200' };
};

export const CustomerModule: React.FC<CustomerModuleProps> = ({
  customers,
  onDelete,
  onEdit,
  onNew,
  departments
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode, pageSize]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return customers.filter(c =>
      !term ||
      c.name.toLowerCase().includes(term) ||
      c.docNumber.includes(term) ||
      c.phone?.includes(term)
    );
  }, [customers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safePage, pageSize]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre, documento o celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full pl-10 pr-3 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#004A99] transition-colors duration-150 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors duration-150 ${viewMode === 'list' ? 'bg-white text-[#004A99] shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista de Listado"
              aria-label="Vista de Listado"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors duration-150 ${viewMode === 'grid' ? 'bg-white text-[#004A99] shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista de Tarjetas"
              aria-label="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onNew}
            className="h-9 w-full md:w-auto bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150 shadow-2xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Customers List (Table Style) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-600">
                  <th className="px-4 py-3">Cliente / Documento</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3 text-center">Código</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-blue-50/40 transition-colors duration-150 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {customer.name ? customer.name.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 leading-tight">{customer.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {(() => {
                              const docInfo = getDocumentTypeInfo(customer.docType);
                              return (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider border ${docInfo.color}`}>
                                  {docInfo.label}
                                </span>
                              );
                            })()}
                            <span className="text-[10px] text-slate-400 font-bold">{customer.docNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                            <Mail className="w-3.5 h-3.5 text-slate-300" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs uppercase font-medium" title={customer.address || ''}>
                          {(() => {
                            const ubi = [customer.department, customer.province, customer.district].filter(Boolean).join(' - ');
                            return ubi || customer.address || 'Sin ubicación';
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase">
                        {customer.code || 'S/C'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${customer.personType === 'JURIDICA' ? 'text-purple-600 bg-purple-50' : 'text-emerald-600 bg-emerald-50'}`}>
                        {customer.personType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {customer.phone && (
                          <button 
                            onClick={() => window.open(`https://wa.me/${customer.phone}`, '_blank')}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => onEdit(customer)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(customer.id)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-2xs cursor-pointer"
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
      ) : (
        /* Customers Grid (Card Style) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCustomers.map((customer) => (
            <motion.div 
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  {customer.phone && (
                    <button 
                      onClick={() => window.open(`https://wa.me/${customer.phone}`, '_blank')}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => onEdit(customer)} 
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(customer.id)} 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title={customer.name}>{customer.name}</h3>
              
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const docInfo = getDocumentTypeInfo(customer.docType);
                  return (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider border ${docInfo.color}`}>
                      {docInfo.label}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-400 font-bold">{customer.docNumber}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" /> {customer.phone || 'Sin teléfono'}
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm truncate" title={customer.email}>
                  <Mail className="w-4 h-4 text-slate-400" /> {customer.email || 'Sin correo'}
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm truncate">
                  <MapPin className="w-4 h-4 text-slate-400" /> 
                  <span className="truncate uppercase font-medium" title={customer.address || ''}>
                    {(() => {
                      const ubi = [customer.department, customer.province, customer.district].filter(Boolean).join(' - ');
                      return ubi || customer.address || 'Sin ubicación';
                    })()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                  {customer.code || 'S/C'}
                </span>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${customer.personType === 'JURIDICA' ? 'text-purple-600 bg-purple-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {customer.personType}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredCustomers.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
            <span>
              Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, filteredCustomers.length)}</strong> de <strong className="text-slate-900">{filteredCustomers.length}</strong> registros
            </span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              aria-label="Registros por página"
              className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#004A99]"
            >
              <option value={10}>10 / pág.</option>
              <option value={20}>20 / pág.</option>
              <option value={50}>50 / pág.</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 tabular-nums">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Página anterior"
              className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="px-2.5 text-slate-700 font-semibold">
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Página siguiente"
              className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm font-semibold text-slate-400">
          No se encontraron clientes con el filtro aplicado
        </div>
      )}
    </motion.div>
  );
};
