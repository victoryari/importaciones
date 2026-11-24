import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, CheckCircle2, Building2, User } from 'lucide-react';

interface AssociatedCustomersModalProps {
  isOpen: boolean;
  primaryCustomer: any | null;
  onSelectCustomer: (customer: any) => void;
  onClose: () => void;
}

export const AssociatedCustomersModal: React.FC<AssociatedCustomersModalProps> = ({
  isOpen,
  primaryCustomer,
  onSelectCustomer,
  onClose
}) => {
  if (!primaryCustomer) return null;
  const associated = primaryCustomer.associatedCustomers || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="associated-customers-modal" className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[88vh]"
          >
            <div className="bg-[#004A99] px-4 py-3 flex items-center justify-between text-white border-b border-blue-900 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Users className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Clientes Asociados Encontrados</h3>
                  <p className="text-[11px] text-blue-200 font-medium">
                    Este cliente tiene otros RUC / DNI vinculados. Elige con cuál deseas emitir.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 bg-slate-50/60">
              {/* Cliente Principal Consultado */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cliente Consultado</p>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(primaryCustomer)}
                  className="w-full text-left bg-white hover:bg-blue-50/70 border-2 border-[#004A99]/30 hover:border-[#004A99] rounded-xl p-3 transition-colors duration-150 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-blue-50 text-[#004A99] rounded-lg shrink-0">
                      {primaryCustomer.personType === 'JURIDICA' || primaryCustomer.docNumber?.length === 11
                        ? <Building2 className="w-4 h-4" />
                        : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#004A99]">
                          {primaryCustomer.docType || (primaryCustomer.docNumber?.length === 11 ? 'RUC' : 'DNI')}: {primaryCustomer.docNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#004A99] text-[10px] font-bold uppercase border border-blue-200">
                          Original
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 uppercase mt-0.5 truncate">{primaryCustomer.name}</p>
                      {primaryCustomer.address && (
                        <p className="text-[11px] text-slate-500 truncate">{primaryCustomer.address}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#004A99] text-white text-[11px] font-semibold group-hover:bg-[#003B7A]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Usar este
                  </span>
                </button>
              </div>

              {/* Lista de Clientes Asociados */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Clientes Asociados ({associated.length})
                </p>
                <div className="space-y-2">
                  {associated.map((assoc: any) => (
                    <button
                      key={assoc.id}
                      type="button"
                      onClick={() => onSelectCustomer(assoc)}
                      className="w-full text-left bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-[#004A99] rounded-xl p-3 transition-colors duration-150 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-[#004A99] rounded-lg shrink-0">
                          {assoc.personType === 'JURIDICA' || assoc.docNumber?.length === 11
                            ? <Building2 className="w-4 h-4" />
                            : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {assoc.docType || (assoc.docNumber?.length === 11 ? 'RUC' : 'DNI')}: {assoc.docNumber}
                            </span>
                            {assoc.relationship && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">
                                {assoc.relationship}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-slate-900 uppercase mt-0.5 truncate">{assoc.name}</p>
                          {assoc.address && (
                            <p className="text-[11px] text-slate-500 truncate">{assoc.address}</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#004A99] group-hover:text-white text-[11px] font-semibold transition-colors">
                        Seleccionar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
