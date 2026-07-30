@echo off
title Gegê CRM - localhost:3010
cd /d "%~dp0"
echo.
echo  Iniciando CRM WhatsApp em http://localhost:3010/whatsapp
echo  Deixe esta janela ABERTA enquanto usar o painel.
echo.
call npm run dev:clean
pause
