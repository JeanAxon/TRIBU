@echo off
title TRIBU - Asistente Contable SRI
echo Iniciando TRIBU SRI...
cd /d "%~dp0"
call npm.cmd start
if %errorlevel% neq 0 (
    echo.
    echo Ocurrio un error al iniciar la aplicacion.
    pause
)
