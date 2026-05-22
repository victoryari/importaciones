# 📦 Sistema de Gestión de Importaciones y Logística

Un sistema integral diseñado para gestionar compras, inventario, ventas (pedidos y facturación) y rutas logísticas de una empresa importadora. Desarrollado con una arquitectura moderna que separa el cliente interactivo del servidor de base de datos.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Prisma%20%7C%20MySQL-indigo)

## 🚀 Tecnologías Utilizadas
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, Lucide React (Iconos), Framer Motion (Animaciones).
- **Backend**: Node.js, Express.js.
- **Base de Datos**: MySQL, Prisma ORM.

## 🛠 Requisitos Previos
Para poder ejecutar este proyecto en tu entorno local, asegúrate de tener instalados:
1. **Node.js** (v18 o superior)
2. **MySQL** (Puedes usar [Laragon](https://laragon.org/) o XAMPP en Windows).
3. **Git** para clonar el repositorio.

---

## ⚙️ Guía de Instalación Paso a Paso

### 1. Clonar el repositorio
Abre tu terminal y clona el proyecto en tu carpeta de entorno de desarrollo (ej. `C:\laragon\www\` si usas Laragon):
```bash
git clone https://github.com/tu-usuario/importaciones.git
cd importaciones
```

### 2. Instalar Dependencias
Instala todas las librerías necesarias tanto para el frontend (React) como para el backend (Node.js) ejecutando el siguiente comando en la raíz del proyecto:
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo llamado `.env` en la raíz del proyecto y agrega las credenciales de tu base de datos MySQL. Reemplaza los valores según la configuración de tu entorno:

```env
# Ejemplo de configuración para MySQL local en Laragon/XAMPP
DATABASE_URL="mysql://root:@localhost:3306/importaciones"
```
> **Nota:** En este ejemplo, el usuario es `root`, sin contraseña, en el puerto `3306`, y la base de datos se llama `importaciones`.

### 4. Sincronizar Base de Datos (Prisma)
Aplica la estructura de tablas a tu base de datos y genera el cliente de Prisma:
```bash
# Empuja los cambios estructurales a MySQL
npx prisma db push

# (Opcional) Genera el cliente local
npx prisma generate
```
> *Asegúrate de que el servicio de MySQL esté corriendo en Laragon/XAMPP antes de ejecutar este comando.*

### 5. Iniciar la Aplicación
El proyecto utiliza un entorno de desarrollo concurrente (levanta el servidor Backend y el Frontend al mismo tiempo). Solo debes ejecutar:
```bash
npm run dev
```

### 6. ¡Listo!
Abre tu navegador y dirígete a:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🌟 Módulos Principales
- **Dashboard**: Vista principal y reportes.
- **Gestión de Stock**: Múltiples almacenes y zonas.
- **Pedidos y Cotizaciones**: Creación y validación de órdenes comerciales.
- **Picking de Almacén**: Interfaz para los operadores (separación de mercadería).
- **Logística y Despacho**: Visualización dinámica de carga en camiones, cálculo de volumen/peso y asignación de rutas a Agencias de Transporte.
- **Facturación electrónica**: Integración para Boletas y Facturas.

## 📝 Comandos Útiles de Base de Datos
Si deseas visualizar la base de datos directamente desde el navegador, Prisma te ofrece una herramienta nativa:
```bash
npx prisma studio
```
Esto abrirá un panel de administración en `http://localhost:5555`.

---
*Desarrollado para optimizar el flujo logístico y comercial empresarial.*
