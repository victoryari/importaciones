@echo off
chcp 65001 >nul
title Iniciar Servicios - Sistema de Importaciones
cd /d "%~dp0"

set "FRONTEND_PORT=3000"

echo ============================================================
echo   SISTEMA DE IMPORTACIONES Y LOGISTICA - INICIO DE SERVICIOS
echo ============================================================
echo.

:: 1. Verificar MySQL (Puerto 3306 - Laragon)
echo [1/4] Verificando base de datos MySQL ^(puerto 3306^)...
netstat -ano | find ":3306 " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto mysql_ok

if exist "C:\laragon\laragon.exe" goto start_laragon
echo       [AVISO] MySQL no esta corriendo en el puerto 3306 y no se encontro C:\laragon\laragon.exe.
echo       Asegurate de iniciar tu servidor MySQL manualmente.
goto step_backend

:start_laragon
echo       MySQL no esta activo. Iniciando Laragon...
start "" "C:\laragon\laragon.exe"
echo       Esperando a que MySQL inicie ^(si Laragon no inicia automaticamente, presiona Start All^)...
timeout /t 6 /nobreak >nul
goto step_backend

:mysql_ok
echo       MySQL ya se encuentra activo.

:step_backend
echo.
:: 2. Iniciar Backend Express + Prisma (Puerto 3001)
echo [2/4] Verificando Backend API ^(puerto 3001^)...
netstat -ano | find ":3001 " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto backend_ok

echo       Iniciando Backend API...
start "Backend API - Importaciones (3001)" /D "%~dp0" cmd /k "npm run server:dev"
goto step_frontend

:backend_ok
echo       Backend API ya se encuentra activo en http://localhost:3001

:step_frontend
echo.
:: 3. Iniciar Frontend Principal Vite (Puerto 3000 o alternativo 3005)
echo [3/4] Verificando Frontend Principal ^(puerto 3000^)...
netstat -ano | find ":3000 " | find "LISTENING" >nul 2>&1
if %errorlevel% neq 0 goto start_frontend_3000

echo       [AVISO] El puerto 3000 ya esta ocupado por otro servicio.
netstat -ano | find ":3005 " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto frontend_3005_ok

set "FRONTEND_PORT=3005"
echo       Iniciando Frontend Principal en puerto alternativo 3005...
start "Frontend Principal - Importaciones (3005)" /D "%~dp0" cmd /k "npx vite --port=3005 --host=0.0.0.0"
goto step_driver

:frontend_3005_ok
set "FRONTEND_PORT=3005"
echo       Frontend Principal ya se encuentra activo en http://localhost:3005
goto step_driver

:start_frontend_3000
echo       Iniciando Frontend Principal en puerto 3000...
start "Frontend Principal - Importaciones (3000)" /D "%~dp0" cmd /k "npm run dev"

:step_driver
echo.
:: 4. Iniciar Driver App (Puerto 3002)
if not exist "%~dp0driver-app\package.json" goto no_driver
echo [4/4] Verificando Driver App ^(puerto 3002^)...
netstat -ano | find ":3002 " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto driver_ok

echo       Iniciando Driver App...
start "Driver App - Importaciones (3002)" /D "%~dp0driver-app" cmd /k "npm run dev"
goto summary

:driver_ok
echo       Driver App ya se encuentra activo en http://localhost:3002
goto summary

:no_driver
echo [4/4] Driver App no encontrado, omitiendo...

:summary
echo.
echo ============================================================
echo   SERVICIOS INICIADOS
echo ============================================================
echo   - Frontend Principal : http://localhost:%FRONTEND_PORT%
echo   - Backend API        : http://localhost:3001
echo   - Driver App         : http://localhost:3002
echo   - Base de Datos MySQL: localhost:3306
echo ============================================================
echo.
echo Abriendo el navegador en http://localhost:%FRONTEND_PORT%...
timeout /t 4 /nobreak >nul
start "" "http://localhost:%FRONTEND_PORT%"

echo.
echo Puedes cerrar esta ventana; los servicios seguiran corriendo en sus propias consolas.
pause
