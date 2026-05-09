import React from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, Trash2, Edit2, Plus, CheckCircle2, XCircle } from 'lucide-react';

interface Seller {
  id: number;
  name: string;
  dni: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface SellerModuleProps {
  sellers: Seller[];
  onEdit: (seller: Seller) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export const SellerModule: React.FC<SellerModuleProps> = ({ sellers, onEdit, onNew, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Vendedores
        </h2>
        <button 
          onClick={onNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Plus className="w-5 h-5" /> Nuevo Vendedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sellers.map((seller) => (
          <motion.div 
            key={seller.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(seller)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => onDelete(seller.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1">{seller.name}</h3>
            <p className="text-slate-400 text-sm mb-4">DNI: {seller.dni}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Phone className="w-4 h-4" /> {seller.phone}
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Mail className="w-4 h-4" /> {seller.email}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              {seller.isActive ? (
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400 text-xs font-bold bg-slate-50 px-3 py-1 rounded-full">
                  <XCircle className="w-3 h-3" /> Inactivo
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
