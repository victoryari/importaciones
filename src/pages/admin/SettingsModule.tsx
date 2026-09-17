import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Image as ImageIcon, Globe, Phone, Mail, MapPin, 
  Building, Facebook, Instagram, MessageCircle, Plus, 
  Trash2, Megaphone, Monitor, Smartphone, Upload, Loader2,
  Sliders, Palette, Store, RefreshCw
} from 'lucide-react';
import axios from 'axios';

interface SettingsModuleProps {
  token: string;
}

export const SettingsModule = ({ token }: SettingsModuleProps) => {
  const [settings, setSettings] = useState<any>({});
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'products' | 'ads'>('general');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, adsRes] = await Promise.all([
        axios.get('/api/settings'),
        axios.get('/api/ads')
      ]);
      setSettings(settingsRes.data);
      setAds(adsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, isAd: boolean = false, adIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(isAd ? `ad-${adIndex}-${key}` : key);
    const fd = new FormData();
    fd.append('image', file);

    try {
      const res = await axios.post('/api/upload', fd, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const url = res.data.url;
      if (isAd && adIndex !== undefined) {
        handleUpdateAd(adIndex, key, url);
      } else {
        handleChange(key, url);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => {
      const updated = { ...prev, [key]: value };
      if (key === 'company_logo') {
        updated.logo = value;
      }
      return updated;
    });
  };

  const handleSaveAll = async () => {
    setSaveLoading(true);
    try {
      for (const key in settings) {
        await axios.post('/api/settings', { key, value: settings[key] }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      alert("Todos los ajustes fueron guardados correctamente");
    } catch (error) {
      console.error("Error saving all settings:", error);
      alert("Error al guardar algunos ajustes");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddAd = () => {
    const newAd = {
      title: 'Nuevo Banner',
      imageUrl: '',
      mobileImageUrl: '',
      link: '#',
      position: 'home-promotional',
      active: true
    };
    setAds([...ads, newAd]);
  };

  const handleUpdateAd = (index: number, field: string, value: any) => {
    const newAds = [...ads];
    newAds[index] = { ...newAds[index], [field]: value };
    setAds(newAds);
  };

  const handleSaveAd = async (ad: any) => {
    setSaveLoading(true);
    try {
      if (ad.id) {
        await axios.put(`/api/ads/${ad.id}`, ad, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/ads', ad, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchData();
      alert("Banner guardado correctamente");
    } catch (error) {
      console.error("Error saving ad:", error);
      alert("Error al guardar el banner");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteAd = async (id: number) => {
    if (!confirm('¿Eliminar este banner publicitario?')) return;
    try {
      await axios.delete(`/api/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      console.error("Error deleting ad:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="animate-spin h-6 w-6 text-blue-700" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5">
      {/* Barra Superior de Ajustes */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 text-blue-800 rounded">
            <Sliders className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              Ajustes Generales del Sistema
            </h2>
            <p className="text-[9px] text-slate-500 font-medium uppercase">Configuración de empresa, catálogo y publicidad</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button 
              type="button"
              onClick={() => setActiveSubTab('general')}
              className={`h-7 px-3 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${activeSubTab === 'general' ? 'bg-[#004A99] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              General
            </button>
            <button 
              type="button"
              onClick={() => setActiveSubTab('products')}
              className={`h-7 px-3 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${activeSubTab === 'products' ? 'bg-[#004A99] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Catálogo
            </button>
            <button 
              type="button"
              onClick={() => setActiveSubTab('ads')}
              className={`h-7 px-3 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${activeSubTab === 'ads' ? 'bg-[#004A99] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Publicidad
            </button>
          </div>

          {activeSubTab !== 'ads' && (
            <button 
              type="button"
              onClick={handleSaveAll}
              disabled={saveLoading}
              className="h-8 px-4 flex items-center gap-1.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold rounded text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saveLoading ? 'Guardando...' : 'Guardar Todo'}
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Información de la Empresa */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-blue-900 font-bold">
              <Building className="w-3.5 h-3.5 text-blue-700" />
              <h3 className="text-xs uppercase tracking-tight">Información de la Empresa</h3>
            </div>
            
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Razón Social / Nombre Comercial</label>
                <input 
                  type="text" 
                  value={settings.company_name || ''} 
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="h-8 w-full px-2.5 rounded border border-slate-300 font-bold text-xs text-blue-900 uppercase focus:border-blue-500 outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">RUC de la Empresa</label>
                <input 
                  type="text" 
                  value={settings.company_ruc || ''} 
                  onChange={(e) => handleChange('company_ruc', e.target.value)}
                  className="h-8 w-full px-2.5 rounded border border-slate-300 font-mono font-bold text-xs text-slate-800 focus:border-blue-500 outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Dirección Fiscal</label>
                <textarea 
                  value={settings.company_address || ''} 
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs font-medium text-slate-800 uppercase focus:border-blue-500 outline-none h-16 resize-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Contacto y Redes */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-emerald-900 font-bold">
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <h3 className="text-xs uppercase tracking-tight">Contacto y Redes Sociales</h3>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Teléfono Principal</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={settings.company_phone || ''} 
                      onChange={(e) => handleChange('company_phone', e.target.value)}
                      className="h-8 w-full pl-7 pr-2 rounded border border-slate-300 text-xs font-medium focus:border-blue-500 outline-none bg-white"
                    />
                    <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">WhatsApp (Ventas / Soporte)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={settings.whatsapp_number || ''} 
                      onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                      className="h-8 w-full pl-7 pr-2 rounded border border-slate-300 text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none bg-white"
                    />
                    <MessageCircle className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Facebook URL</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={settings.facebook_url || ''} 
                      onChange={(e) => handleChange('facebook_url', e.target.value)}
                      className="h-8 w-full pl-7 pr-2 rounded border border-slate-300 text-xs font-medium focus:border-blue-500 outline-none bg-white"
                    />
                    <Facebook className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Instagram URL</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={settings.instagram_url || ''} 
                      onChange={(e) => handleChange('instagram_url', e.target.value)}
                      className="h-8 w-full pl-7 pr-2 rounded border border-slate-300 text-xs font-medium focus:border-blue-500 outline-none bg-white"
                    />
                    <Instagram className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identidad Gráfica */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 md:col-span-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-blue-950 font-bold">
              <ImageIcon className="w-3.5 h-3.5 text-blue-700" />
              <h3 className="text-xs uppercase tracking-tight">Identidad Gráfica y Recursos Visuales</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Logotipo Principal de la Empresa</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={settings.company_logo || ''} 
                    onChange={(e) => handleChange('company_logo', e.target.value)}
                    className="h-8 flex-1 px-2 rounded border border-slate-300 text-xs focus:border-blue-500 outline-none bg-white"
                    placeholder="URL de la imagen del logotipo..."
                  />
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'company_logo')} />
                  <button 
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading === 'company_logo'}
                    className="h-8 px-3 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {uploading === 'company_logo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-slate-700" />}
                    Subir
                  </button>
                </div>
                {settings.company_logo && (
                  <div className="mt-2 p-2 border border-slate-200 rounded bg-slate-50 flex justify-center relative group">
                    <img src={settings.company_logo} alt="Logo Preview" className="h-12 object-contain" />
                    <button onClick={() => handleChange('company_logo', '')} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Favicon (Icono de la Pestaña)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={settings.favicon || ''} 
                    onChange={(e) => handleChange('favicon', e.target.value)}
                    className="h-8 flex-1 px-2 rounded border border-slate-300 text-xs focus:border-blue-500 outline-none bg-white"
                    placeholder="URL del icono favicon..."
                  />
                  <input type="file" ref={faviconInputRef} className="hidden" accept="image/x-icon,image/png,image/jpeg" onChange={(e) => handleUpload(e, 'favicon')} />
                  <button 
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploading === 'favicon'}
                    className="h-8 px-3 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {uploading === 'favicon' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-slate-700" />}
                    Subir
                  </button>
                </div>
                {settings.favicon && (
                  <div className="mt-2 p-2 border border-slate-200 rounded bg-slate-50 flex justify-center relative group">
                    <img src={settings.favicon} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                    <button onClick={() => handleChange('favicon', '')} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'products' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-orange-950 font-bold">
              <Store className="w-3.5 h-3.5 text-orange-600" />
              <h3 className="text-xs uppercase tracking-tight">Visualización de Productos</h3>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Tarjetas de Producto por Fila (Tienda Web)</label>
              <select
                value={settings.products_per_page || '3'}
                onChange={(e) => handleChange('products_per_page', e.target.value)}
                className="h-8 w-full px-2 rounded border border-slate-300 font-bold text-xs focus:border-blue-500 outline-none bg-white"
              >
                <option value="2">2 tarjetas</option>
                <option value="3">3 tarjetas</option>
                <option value="4">4 tarjetas</option>
                <option value="5">5 tarjetas</option>
                <option value="6">6 tarjetas</option>
              </select>
              <p className="text-[9px] text-slate-400 font-medium">Determina la densidad de elementos en el catálogo público.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={handleAddAd}
              className="h-8 flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded font-bold text-xs uppercase transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Banner
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {ads.map((ad, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Título del Banner</label>
                      <input 
                        type="text" 
                        value={ad.title} 
                        onChange={(e) => handleUpdateAd(index, 'title', e.target.value)}
                        className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-bold focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">URL de Redirección</label>
                      <input 
                        type="text" 
                        value={ad.link || ''} 
                        onChange={(e) => handleUpdateAd(index, 'link', e.target.value)}
                        className="h-8 w-full px-2 rounded border border-slate-300 text-xs font-mono focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-blue-700" /> Imagen Desktop
                      </label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={ad.imageUrl} 
                          onChange={(e) => handleUpdateAd(index, 'imageUrl', e.target.value)}
                          className="h-8 flex-1 px-2 rounded border border-slate-300 outline-none text-xs bg-white"
                        />
                        <input type="file" id={`ad-web-${index}`} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'imageUrl', true, index)} />
                        <button type="button" onClick={() => document.getElementById(`ad-web-${index}`)?.click()} className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer"><Upload className="w-3.5 h-3.5 text-slate-600" /></button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-700" /> Imagen Móvil
                      </label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={ad.mobileImageUrl || ''} 
                          onChange={(e) => handleUpdateAd(index, 'mobileImageUrl', e.target.value)}
                          className="h-8 flex-1 px-2 rounded border border-slate-300 outline-none text-xs bg-white"
                        />
                        <input type="file" id={`ad-mob-${index}`} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'mobileImageUrl', true, index)} />
                        <button type="button" onClick={() => document.getElementById(`ad-mob-${index}`)?.click()} className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer"><Upload className="w-3.5 h-3.5 text-slate-600" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ad.active} 
                        onChange={(e) => handleUpdateAd(index, 'active', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase">Activo en la Web</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Posición:</span>
                      <select 
                        value={ad.position} 
                        onChange={(e) => handleUpdateAd(index, 'position', e.target.value)}
                        className="h-7 text-xs font-bold border border-slate-300 rounded px-2 outline-none bg-white"
                      >
                        <option value="home-promotional">Principal (Home)</option>
                        <option value="category-side">Lateral Categorías</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="w-full space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block text-center uppercase">Previsualización</span>
                    <div className="w-full h-20 bg-slate-200 rounded overflow-hidden relative flex items-center justify-center">
                      {uploading?.startsWith(`ad-${index}`) ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : ad.imageUrl ? (
                        <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 w-full mt-2">
                    <button 
                      type="button"
                      onClick={() => handleSaveAd(ad)}
                      className="flex-1 h-7 bg-[#004A99] hover:bg-blue-800 text-white rounded font-bold text-[10px] uppercase transition-colors cursor-pointer"
                    >
                      {saveLoading ? '...' : 'Guardar'}
                    </button>
                    {ad.id && (
                      <button 
                        type="button"
                        onClick={() => handleDeleteAd(ad.id)}
                        className="h-7 px-2 text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {ads.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-bold text-xs uppercase">No hay banners publicitarios registrados</p>
                <button type="button" onClick={handleAddAd} className="text-blue-700 text-xs font-bold mt-1 uppercase hover:underline cursor-pointer">+ Agregar Banner</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
