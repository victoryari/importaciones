---
name: standard-erp-forms
description: >-
  Estandariza el diseño, tipografía, dimensiones, espaciado de filas y estructura visual de todos los formularios modales y vistas de registro del sistema ERP Carmelita (Proveedores, Clientes, Transportistas, Productos, Almacenes, Categorías, etc.). Utilizar siempre que se cree, rediseñe o modifique un formulario modal o vista de registro en la aplicación.
---

# 🎨 Estándar Visual y de Diseño para Formularios de Registro ERP

Este skill documenta y estandariza los lineamientos de interfaz de usuario (UI/UX) para todos los formularios modales y vistas de registro dentro del ERP de Carmelita.

---

## 1. 📐 Dimensiones y Contenedor Modal

```tsx
<div className="fixed inset-0 z-[250] flex items-center justify-center p-3 overflow-hidden">
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }} 
    onClick={onClose} 
    className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
  />
  
  <motion.div 
    initial={{ opacity: 0, scale: 0.97, y: 10 }} 
    animate={{ opacity: 1, scale: 1, y: 0 }} 
    exit={{ opacity: 0, scale: 0.97, y: 10 }} 
    className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 max-h-[92vh]"
  >
```

* **Ancho Máximo:** `max-w-xl` (576px) para formularios estándar o `max-w-2xl` para formularios con alta densidad de columnas.
* **Altura Máxima:** `max-h-[92vh]` con `flex flex-col` y `overflow-hidden` para asegurar que el contenido interno tenga scroll suave sin tapar la cabecera ni el footer.
* **Fondo del Backdrop:** `bg-slate-900/50 backdrop-blur-xs`.

---

## 2. 🏛️ Cabecera Institucional ERP (Header)

```tsx
<div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white shadow-sm shrink-0 border-b border-blue-900">
  <div className="flex items-center gap-2">
    <div className="p-1 bg-white/10 rounded">
      <Icon className="w-4 h-4 text-blue-200" />
    </div>
    <div>
      <h2 className="text-xs font-bold text-white uppercase tracking-tight">
        {editingItem ? 'Editar [Entidad]' : 'Registro de Nuevo [Entidad]'}
      </h2>
      <p className="text-[9px] text-blue-200 uppercase font-medium">Módulo de [Subtítulo]</p>
    </div>
  </div>
  <button 
    onClick={onClose} 
    className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
  >
    <X className="w-4 h-4" />
  </button>
</div>
```

* **Color de Fondo:** Azul institucional `#004A99`.
* **Padding:** `px-4 py-2.5` (compacto y elegante).
* **Tipografía del Título:** `text-xs font-bold text-white uppercase tracking-tight`.
* **Tipografía del Subtítulo:** `text-[9px] text-blue-200 uppercase font-medium`.
* **Botón Cerrar:** Icono `w-4 h-4` con `hover:bg-red-600`.

---

## 3. 📦 Estructura de Secciones (Fieldsets / Tarjetas)

```tsx
<form className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
      <SectionIcon className="w-3.5 h-3.5 text-blue-700" />
      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
        Título de la Sección
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {/* Campos de la sección */}
    </div>
  </div>
</form>
```

* **Fondo del formulario:** `bg-slate-50/70` con padding `p-3` y separación entre secciones `space-y-2.5`.
* **Tarjetas de Sección:** `bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2`.
* **Encabezado de Sección:** Borde inferior sutil `border-b border-slate-100 pb-1.5`, icono `w-3.5 h-3.5 text-blue-700` y texto `text-[11px] font-bold text-blue-950 uppercase`.

---

## 4. 📝 Inputs, Selects y Tipografía de Campos

### Reglas de Dimensiones y Tipografía:
* **Altura Estándar:** **`h-8` (32px)** para todos los inputs y selects.
* **Etiquetas (Labels):** `text-[10px] font-bold text-slate-600 uppercase` con contenedor `space-y-1`.
* **Texto de Campos:** `text-xs font-bold text-slate-800` (o `text-xs font-medium` para direcciones y correos).
* **Bordes y Focos:** `border border-slate-300 rounded focus:border-blue-500 outline-none bg-white`.
* **Espaciado en Grillas:** `gap-2`.

### Patrón para Documento con Botón de Consulta (RUC / DNI):
```tsx
<div className="space-y-1">
  <label className="text-[10px] font-bold text-slate-600 uppercase">Número de Documento</label>
  <div className="relative">
    <input 
      type="text" 
      value={formData.docNumber} 
      onChange={e => setFormData({...formData, docNumber: e.target.value})}
      className="w-full h-8 pl-7 pr-20 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800 focus:border-blue-500 outline-none"
      placeholder="Número de doc..."
    />
    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
    <button 
      type="button" 
      onClick={handleConsultDocument}
      disabled={consultLoading || !formData.docNumber}
      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-blue-800 disabled:opacity-40 transition-colors cursor-pointer"
    >
      {consultLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
      {consultLoading ? 'Buscando...' : 'Buscar'}
    </button>
  </div>
</div>
```

### Patrón para Ubigeo (Departamento, Provincia, Distrito):
Distribución en 3 columnas compactas con `grid grid-cols-1 sm:grid-cols-3 gap-2`:
* Selects de altura `h-8`, texto `text-xs font-medium uppercase`, y estilo deshabilitado `disabled:bg-slate-100`.

---

## 5. 🔘 Pie de Formulario y Botones de Acción (Footer)

```tsx
<div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
  <button 
    type="button" 
    onClick={onClose} 
    className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
  >
    <X className="w-3.5 h-3.5 text-red-500" /> Cancelar
  </button>

  <button 
    type="button" 
    onClick={onSubmit}
    disabled={loading}
    className="h-8 px-5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
  >
    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
    {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Guardar')}
  </button>
</div>
```

---

## 6. 📋 Checklist de Validación al Crear Nuevas Vistas:
1. [ ] Altura de inputs y selects fijada en `h-8` (32px).
2. [ ] Encabezado `#004A99` con altura `py-2.5` y títulos en `text-xs` / `text-[9px]`.
3. [ ] Etiquetas en `text-[10px] font-bold text-slate-600 uppercase`.
4. [ ] Secciones con `p-3`, `space-y-2` y títulos `text-[11px]`.
5. [ ] Espaciado de grilla en `gap-2` para evitar scrolls verticales innecesarios.
6. [ ] Botones del footer de `h-8` con estilo ERP corporativo.
