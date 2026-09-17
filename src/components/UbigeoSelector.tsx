import React from 'react';
import { DEPARTMENTS, PROVINCES, DISTRICTS, normalizeUbigeoString } from '../lib/ubigeoData';

interface UbigeoSelectorProps {
  department: string;
  province: string;
  district: string;
  onChange: (data: { department: string; province: string; district: string }) => void;
  className?: string;
  showLabels?: boolean;
}

export function UbigeoSelector({ department, province, district, onChange, className = "", showLabels = false }: UbigeoSelectorProps) {
  const selectedDeptObj = DEPARTMENTS.find(d => d.id === department || normalizeUbigeoString(d.name) === normalizeUbigeoString(department));
  const selectedDeptId = selectedDeptObj?.id || '';

  const provincesList = selectedDeptId && PROVINCES[selectedDeptId] ? PROVINCES[selectedDeptId] : [];
  const selectedProvObj = provincesList.find(p => p.id === province || normalizeUbigeoString(p.name) === normalizeUbigeoString(province));
  const selectedProvId = selectedProvObj?.id || '';

  const fullProvId = selectedDeptId && selectedProvId ? selectedDeptId + selectedProvId : '';
  const districtsList = fullProvId && DISTRICTS[fullProvId] ? DISTRICTS[fullProvId] : [];
  const selectedDistObj = districtsList.find(d => d.id === district || normalizeUbigeoString(d.name) === normalizeUbigeoString(district));
  const selectedDistId = selectedDistObj?.id || '';

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const dept = DEPARTMENTS.find(d => d.id === val);
    onChange({ department: dept?.name ? dept.name.toUpperCase() : val, province: "", district: "" });
  };

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const prov = provincesList.find(p => p.id === val);
    onChange({ department: selectedDeptObj?.name ? selectedDeptObj.name.toUpperCase() : department, province: prov?.name ? prov.name.toUpperCase() : val, district: "" });
  };

  const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const dist = districtsList.find(d => d.id === val);
    onChange({ 
      department: selectedDeptObj?.name ? selectedDeptObj.name.toUpperCase() : department, 
      province: selectedProvObj?.name ? selectedProvObj.name.toUpperCase() : province, 
      district: dist?.name ? dist.name.toUpperCase() : val 
    });
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-2 ${className}`}>
      <div className="space-y-0.5">
        {showLabels && <label className="text-[10px] font-bold text-slate-500 uppercase ml-0.5">Departamento</label>}
        <select
          value={selectedDeptId}
          onChange={handleDeptChange}
          className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 truncate uppercase"
        >
          <option value="">--DEPARTAMENTO--</option>
          {DEPARTMENTS.map(d => (
            <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="space-y-0.5">
        {showLabels && <label className="text-[10px] font-bold text-slate-500 uppercase ml-0.5">Provincia</label>}
        <select
          value={selectedProvId}
          onChange={handleProvChange}
          disabled={!selectedDeptId}
          className={`h-8 w-full border rounded px-2 text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 truncate uppercase ${selectedDeptId ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
        >
          <option value="">--PROVINCIA--</option>
          {provincesList.map(p => (
            <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="space-y-0.5">
        {showLabels && <label className="text-[10px] font-bold text-slate-500 uppercase ml-0.5">Distrito</label>}
        <select
          value={selectedDistId}
          onChange={handleDistChange}
          disabled={!selectedProvId}
          className={`h-8 w-full border rounded px-2 text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 truncate uppercase ${selectedProvId ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
        >
          <option value="">--DISTRITO--</option>
          {districtsList.map(d => (
            <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

