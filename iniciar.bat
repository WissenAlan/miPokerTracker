@echo off
title miPokerTracker v2.0
echo ====================================================
echo        Iniciando miPokerTracker v2.0
echo ====================================================
echo.
echo [1/2] Levantando servidor local en http://localhost:3001...
start "" http://localhost:3001
echo [2/2] Abriendo interfaz en el navegador...
echo.
echo Presiona Ctrl + C en esta ventana cuando quieras cerrar la aplicacion.
echo.
node server/index.js
pause
