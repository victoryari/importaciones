import React, { useState, useEffect } from 'react';
import { DEPARTMENTS, PROVINCES, DISTRICTS } from '../lib/ubigeoData';

interface UbigeoSelectorProps {
  department: string;
  province: string;
  district: string;
  onChange: (data: { department: string; province: string; district: string }) => void;
  className?: string;
}

export function UbigeoSelector({ department, province, district, onChange, className = "" }: UbigeoSelectorProps) {
  const [selectedDept, setSelectedDept] = useState(department || "");
  const [selectedProv, setSelectedProv] = useState(province || "");
  const [selectedDist, setSelectedDist] = useState(district || "");

  // Sync internal state with props
  useEffect(() => {
    setSelectedDept(department || "");
  }, [department]);

  useEffect(() => {
    setSelectedProv(province || "");
  }, [province]);

  useEffect(() => {
    setSelectedDist(district || "");
  }, [district]);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDept(val);
    setSelectedProv("");
    setSelectedDist("");
    onChange({ department: val, province: "", district: "" });
  };

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProv(val);
    setSelectedDist("");
    onChange({ department: selectedDept, province: val, district: "" });
  };

  const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDist(val);
    onChange({ department: selectedDept, province: selectedProv, district: val });
  };

  const availableProvinces = selectedDept ? PROVINCES[selectedDept] || [] : [];
  const availableDistricts = selectedProv ? DISTRICTS[selectedProv] || [] : [];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Departamento</label>
        <select
          value={selectedDept}
          onChange={handleDeptChange}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
        >
          <option value="">Seleccionar...</option>
          {DEPARTMENTS.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Provincia</label>
        <select
          value={selectedProv}
          onChange={handleProvChange}
          disabled={!selectedDept}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Seleccionar...</option>
          {availableProvinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Distrito</label>
        <select
          value={selectedDist}
          onChange={handleDistChange}
          disabled={!selectedProv}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Seleccionar...</option>
          {availableDistricts.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
