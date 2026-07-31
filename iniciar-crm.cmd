@echo off
title Gegê CRM - localhost:3010
cd /d "%~dp0"
echo.
echo  Iniciando CRM WhatsApp em http://localhost:3010/whatsapp
echo  Aguarde compilar (~10s). Deixe esta janela ABERTA.
echo  Se der erro 500, feche tudo e rode de novo.
echo.
call npm run dev
pause
