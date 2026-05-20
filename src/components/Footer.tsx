import { useState, useEffect } from 'react';
import { Facebook, Instagram, Mail, MapPin, Phone, MessageCircle, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(setSettings);
  }, []);

  return (
    <footer className="bg-slate-950 text-slate-300 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              {(settings.company_logo || settings.logo) ? (
                <img src={settings.company_logo || settings.logo} alt="Logo" className="h-10 w-auto object-contain brightness-0 invert" />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  C
                </div>
              )}
              {!(settings.company_logo || settings.logo) && (
                <div>
                  <span className="text-xl font-bold text-white block leading-tight">{settings['business-name'] || 'Carmelita'}</span>
                  <span className="text-xs uppercase tracking-widest text-blue-500 font-semibold">{settings['business-tagline'] || 'Del Norte'}</span>
                </div>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              {settings['footer-description'] || 'Importaciones Carmelita del Norte es líder en distribución mayorista en el norte peruano. Ofrecemos los mejores productos para el hogar y negocio con garantía de calidad.'}
            </p>
            <div className="flex gap-4">
              {settings['social-facebook'] && (
                <a href={settings['social-facebook']} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-blue-600 rounded-full transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings['social-instagram'] && (
                <a href={settings['social-instagram']} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-blue-600 rounded-full transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings['social-tiktok'] && (
                <a href={settings['social-tiktok']} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 hover:bg-blue-600 rounded-full transition-colors">
                  <Music2 className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Nuestra Empresa</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/nosotros" className="hover:text-blue-500 transition-colors">Nosotros</Link></li>
              <li><Link to="/sucursales" className="hover:text-blue-500 transition-colors">Nuestras Sucursales</Link></li>
              <li><Link to="/contact" className="hover:text-blue-500 transition-colors">Trabaja con nosotros</Link></li>
              <li><Link to="/catalogo" className="hover:text-blue-500 transition-colors">Catálogos PDF</Link></li>
              <li><Link to="/blog" className="hover:text-blue-500 transition-colors">Blog y Noticias</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Atención</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex flex-col gap-1">
                <span className="text-xs uppercase text-slate-500 font-bold tracking-widest">Horario</span>
                <span className="text-slate-300 font-bold">{settings['footer-schedule'] || 'Lun - Sáb: 8:00 AM - 7:00 PM'}</span>
              </li>
              <li><Link to="/terminos" className="hover:text-blue-500 transition-colors">Términos y Condiciones</Link></li>
              <li><Link to="/privacidad" className="hover:text-blue-500 transition-colors">Políticas de Privacidad</Link></li>
              <li><Link to="/libro" className="hover:text-blue-500 transition-colors">Libro de Reclamaciones</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                <span>{settings['footer-address'] || 'Av. Principal 123, Chiclayo, Lambayeque - Perú'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-600 shrink-0" />
                <span>{settings.phone || '+51 987 654 321'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                <span>{settings.contact_email || 'ventas@carmelita.com.pe'}</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-green-500 font-bold">WhatsApp: {settings.whatsapp || '+51 912 345 678'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {settings['business-name'] || 'Importaciones Carmelita del Norte S.A.C.'}. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Desarrollado por el Equipo de Sistemas</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
