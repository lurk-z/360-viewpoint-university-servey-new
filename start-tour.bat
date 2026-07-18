@echo off
setlocal
cd /d "%~dp0"
set "TOUR_PORT=8360"
set "TOUR_URL=http://127.0.0.1:%TOUR_PORT%"

where npm.cmd >nul 2>nul
if not %errorlevel%==0 (
  echo Could not find Node.js/npm.
  echo Install Node.js 20.19 or newer, then run this launcher again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies are not installed.
  echo Run: npm install
  pause
  exit /b 1
)

if exist ".next\BUILD_ID" goto start_production

echo Starting Next.js development server at %TOUR_URL% ...
start "" "%TOUR_URL%"
npm.cmd run dev -- --port %TOUR_PORT%
exit /b %errorlevel%

:start_production
echo Starting Next.js production server at %TOUR_URL% ...
start "" "%TOUR_URL%"
npm.cmd run start
exit /b %errorlevel%
