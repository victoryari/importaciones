import { useState, useEffect, useRef } from 'react';
import { Save, Image as ImageIcon, Globe, Phone, Mail, MapPin, Building, Facebook, Instagram, MessageCircle, Plus, Trash2, Megaphone, Monitor, Smartphone, Upload, Loader2 } from 'lucide-react';
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
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'ads'>('general');
  
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
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setSaveLoading(true);
    try {
      for (const key in settings) {
        await axios.post('/api/settings', { key, value: settings[key] }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      alert("Todos los ajustes guardados correctamente");
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
      alert("Banner guardado");
    } catch (error) {
      console.error("Error saving ad:", error);
      alert("Error al guardar el banner");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteAd = async (id: number) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      await axios.delete(`/api/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      console.error("Error deleting ad:", error);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setActiveSubTab('general')}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeSubTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              General
            </button>
            <button 
              onClick={() => setActiveSubTab('ads')}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeSubTab === 'ads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Publicidad (Banners)
            </button>
          </div>
        </div>
        {activeSubTab === 'general' && (
          <button 
            onClick={handleSaveAll}
            disabled={saveLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saveLoading ? 'Guardando...' : 'Guardar Todo'}
          </button>
        )}
      </div>

      {activeSubTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
              <Building className="w-5 h-5" />
              <h3>Información de la Empresa</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={settings.company_name || ''} 
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">RUC</label>
                <input 
                  type="text" 
                  value={settings.company_ruc || ''} 
                  onChange={(e) => handleChange('company_ruc', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dirección Fiscal</label>
                <textarea 
                  value={settings.company_address || ''} 
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contacto y Redes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
              <Globe className="w-5 h-5" />
              <h3>Contacto y Redes Sociales</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono Principal</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={settings.company_phone || ''} 
                      onChange={(e) => handleChange('company_phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp (Web)</label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-green-500" />
                    <input 
                      type="text" 
                      value={settings.whatsapp_number || ''} 
                      onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Facebook URL</label>
                  <input 
                    type="text" 
                    value={settings.facebook_url || ''} 
                    onChange={(e) => handleChange('facebook_url', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Instagram URL</label>
                  <input 
                    type="text" 
                    value={settings.instagram_url || ''} 
                    onChange={(e) => handleChange('instagram_url', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Apariencia */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 text-purple-600 font-bold mb-2">
              <ImageIcon className="w-5 h-5" />
              <h3>Apariencia y Recursos Visuales</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Logotipo Principal</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={settings.company_logo || ''} 
                      onChange={(e) => handleChange('company_logo', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      placeholder="URL de la imagen..."
                    />
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'company_logo')} />
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading === 'company_logo'}
                    className="px-4 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    {uploading === 'company_logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Subir
                  </button>
                </div>
                {settings.company_logo && (
                  <div className="mt-4 p-4 border border-dashed rounded-2xl bg-slate-50 flex justify-center relative group">
                    <img src={settings.company_logo} alt="Logo Preview" className="h-16 object-contain" />
                    <button onClick={() => handleChange('company_logo', '')} className="absolute top-2 right-2 p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Favicon (Icono Pestaña)</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={settings.favicon || ''} 
                      onChange={(e) => handleChange('favicon', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      placeholder="URL del icono..."
                    />
                  </div>
                  <input type="file" ref={faviconInputRef} className="hidden" accept="image/x-icon,image/png,image/jpeg" onChange={(e) => handleUpload(e, 'favicon')} />
                  <button 
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploading === 'favicon'}
                    className="px-4 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    {uploading === 'favicon' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Subir
                  </button>
                </div>
                {settings.favicon && (
                  <div className="mt-4 p-4 border border-dashed rounded-2xl bg-slate-50 flex justify-center relative group">
                    <img src={settings.favicon} alt="Favicon Preview" className="h-10 w-10 object-contain" />
                    <button onClick={() => handleChange('favicon', '')} className="absolute top-2 right-2 p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={handleAddAd}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Banner
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {ads.map((ad, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Título del Banner</label>
                      <input 
                        type="text" 
                        value={ad.title} 
                        onChange={(e) => handleUpdateAd(index, 'title', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Link de Acción (URL)</label>
                      <input 
                        type="text" 
                        value={ad.link || ''} 
                        onChange={(e) => handleUpdateAd(index, 'link', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Monitor className="w-3 h-3" /> Imagen Web (Desktop)
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={ad.imageUrl} 
                          onChange={(e) => handleUpdateAd(index, 'imageUrl', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-[10px]"
                        />
                        <input type="file" id={`ad-web-${index}`} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'imageUrl', true, index)} />
                        <button onClick={() => document.getElementById(`ad-web-${index}`)?.click()} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200"><Upload className="w-4 h-4 text-slate-600" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Imagen Móvil (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={ad.mobileImageUrl || ''} 
                          onChange={(e) => handleUpdateAd(index, 'mobileImageUrl', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-[10px]"
                        />
                        <input type="file" id={`ad-mob-${index}`} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'mobileImageUrl', true, index)} />
                        <button onClick={() => document.getElementById(`ad-mob-${index}`)?.click()} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200"><Upload className="w-4 h-4 text-slate-600" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ad.active} 
                        onChange={(e) => handleUpdateAd(index, 'active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-600">Visible en Web</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Posición:</span>
                      <select 
                        value={ad.position} 
                        onChange={(e) => handleUpdateAd(index, 'position', e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="home-promotional">Principal (Home)</option>
                        <option value="category-side">Lateral Categorías</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-full space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block text-center uppercase">Previsualización</span>
                    <div className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative">
                      {uploading?.startsWith(`ad-${index}`) ? (
                        <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                      ) : ad.imageUrl ? (
                        <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-400" /></div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full mt-4">
                    <button 
                      onClick={() => handleSaveAd(ad)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all"
                    >
                      {saveLoading ? '...' : 'Guardar'}
                    </button>
                    {ad.id && (
                      <button 
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {ads.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No hay banners configurados</p>
                <button onClick={handleAddAd} className="text-blue-600 text-sm font-bold mt-2">Agregar el primero</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
