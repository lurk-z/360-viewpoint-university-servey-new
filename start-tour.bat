@echo off
setlocal
cd /d "%~dp0"
set "TOUR_PORT=8360"
set "TOUR_URL=http://127.0.0.1:%TOUR_PORT%"

if exist "dist\index.html" goto serve_dist

where npm.cmd >nul 2>nul
if %errorlevel%==0 (
  if not exist "node_modules" (
    echo Dependencies are not installed.
    echo Run: npm install
    pause
    exit /b 1
  )
  echo Starting development server at %TOUR_URL% ...
  start "" "%TOUR_URL%"
  npm.cmd run dev -- --host 127.0.0.1 --port %TOUR_PORT%
  exit /b %errorlevel%
)

echo Could not find a production build or Node.js.
echo Run "npm install" and "npm run build" first.
pause
exit /b 1

:serve_dist
where python >nul 2>nul
if %errorlevel%==0 (
  echo Serving the production build at %TOUR_URL% ...
  start "" "%TOUR_URL%"
  python -m http.server %TOUR_PORT% --bind 127.0.0.1 --directory dist
  exit /b %errorlevel%
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Serving the production build at %TOUR_URL% ...
  start "" "%TOUR_URL%"
  py -m http.server %TOUR_PORT% --bind 127.0.0.1 --directory dist
  exit /b %errorlevel%
)

where npm.cmd >nul 2>nul
if %errorlevel%==0 if exist "node_modules" (
  echo Previewing the production build at %TOUR_URL% ...
  start "" "%TOUR_URL%"
  npm.cmd run preview -- --host 127.0.0.1 --port %TOUR_PORT%
  exit /b %errorlevel%
)

echo The production build exists, but no local HTTP server was found.
echo Install Python or Node.js, then run this launcher again.
pause
exit /b 1
