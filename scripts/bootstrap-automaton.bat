@echo off
REM ===========================================================================
REM bootstrap-automaton.bat
REM
REM Windows entry point for the Conway Automaton sovereign-agent runtime
REM alongside PRISM. Clones, installs, builds, and starts the runtime in
REM the background; then sets AUTOMATON_BASE_URL in PRISM's .env so the
REM /api/automaton/* endpoints proxy to the live runtime.
REM
REM Usage:
REM   scripts\bootstrap-automaton.bat
REM ===========================================================================
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0.."
set "AUTOMATON_DIR=%ROOT_DIR%\automaton"
set "AUTOMATON_REPO=https://github.com/Conway-Research/automaton.git"
if "%AUTOMATON_PORT%"=="" set "AUTOMATON_PORT=7777"

echo.
echo ============================================================
echo   PRISM x Conway Automaton bootstrap (Windows)
echo ============================================================

REM Step 1 -- clone
if not exist "%AUTOMATON_DIR%" (
  echo.
  echo [1/4] Cloning Conway-Research/automaton
  git clone "%AUTOMATON_REPO%" "%AUTOMATON_DIR%"
) else (
  echo.
  echo [1/4] ./automaton/ exists, pulling latest
  pushd "%AUTOMATON_DIR%"
  git pull --ff-only
  popd
)

REM Step 2 -- install
echo.
echo [2/4] Installing dependencies (pnpm)
pushd "%AUTOMATON_DIR%"
call pnpm install
if errorlevel 1 (
  echo pnpm install failed
  exit /b 1
)
popd

REM Step 3 -- build
echo.
echo [3/4] Building automaton
pushd "%AUTOMATON_DIR%"
call pnpm build
if errorlevel 1 (
  echo pnpm build failed
  exit /b 1
)
popd

REM Step 4 -- start runtime in background
echo.
echo [4/4] Starting automaton runtime in background on port %AUTOMATON_PORT%
if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"
start "automaton-runtime" /B cmd /c "set AUTOMATON_PORT=%AUTOMATON_PORT% && cd /d %AUTOMATON_DIR% && node dist/index.js --run > %ROOT_DIR%\logs\automaton.log 2>&1"

REM Update .env
set "ENV_FILE=%ROOT_DIR%\.env"
if not exist "%ENV_FILE%" (
  copy "%ROOT_DIR%\.env.example" "%ENV_FILE%"
)

REM Append/replace AUTOMATON_BASE_URL using PowerShell (avoids sed dependency)
powershell -NoProfile -Command ^
  "$envFile = '%ENV_FILE%'; ^
   $key = 'AUTOMATON_BASE_URL'; ^
   $val = 'http://localhost:%AUTOMATON_PORT%'; ^
   $lines = Get-Content $envFile; ^
   $found = $false; ^
   $updated = $lines | ForEach-Object { if ($_ -match \"^$key=\") { $found = $true; \"$key=$val\" } else { $_ } }; ^
   if (-not $found) { $updated += \"$key=$val\" }; ^
   $updated | Set-Content $envFile"

echo.
echo ============================================================
echo   SUCCESS: Automaton runtime booting on http://localhost:%AUTOMATON_PORT%
echo   Logs:    type %ROOT_DIR%\logs\automaton.log
echo   Action:  restart PRISM api (cd api ^&^& npm run dev) so it picks up the env
echo ============================================================
endlocal