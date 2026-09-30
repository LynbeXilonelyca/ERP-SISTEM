@echo off
title ERP Admin — Dev Server
cd /d "D:\1-Assest Website\Ini SWD Sistem\Ini SWD Sistem\erp-admin"

echo.
echo  ============================================
echo    ERP Admin - Distribution System
echo    Starting development server...
echo  ============================================
echo.

:: Start the dev server in the background and wait for it to be ready
start /b npm run dev > "%TEMP%\erp-dev.log" 2>&1

:: Wait a few seconds for Next.js to boot
echo  Waiting for server to start...
timeout /t 5 /nobreak >nul

:: Try to open browser, retry until server responds
set MAX_RETRIES=15
set RETRY=0

:check_loop
set /a RETRY+=1
if %RETRY% GTR %MAX_RETRIES% goto open_anyway

:: Check if port 3000 is listening
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto open_browser

echo  Still waiting... (%RETRY%/%MAX_RETRIES%)
timeout /t 2 /nobreak >nul
goto check_loop

:open_browser
echo.
echo  Server is ready!
echo  Opening http://localhost:3000 ...
echo.
start "" "http://localhost:3000"
goto wait_server

:open_anyway
echo.
echo  Opening browser (server may still be starting)...
start "" "http://localhost:3000"

:wait_server
echo.
echo  ============================================
echo    Server running at http://localhost:3000
echo    Press Ctrl+C to stop the server
echo  ============================================
echo.

:: Keep window open and show live output
npm run dev
