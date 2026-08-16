@echo off
REM ===========================================================================
REM stop-automaton.bat
REM
REM Stops the Conway Automaton runtime that was started by
REM bootstrap-automaton.bat and reverts .env to sandbox mode.
REM ===========================================================================
setlocal

set "ROOT_DIR=%~dp0.."
set "AUTOMATON_DIR=%ROOT_DIR%\automaton"

echo Stopping Conway Automaton runtime...

REM Kill the runtime by its window title (set in bootstrap-automaton.bat).
taskkill /F /FI "WINDOWTITLE eq automaton-runtime*" 2>nul
if errorlevel 1 (
  echo No automaton runtime found by window title.
)

REM Comment out AUTOMATON_BASE_URL in .env so PRISM reverts to sandbox.
set "ENV_FILE=%ROOT_DIR%\.env"
if exist "%ENV_FILE%" (
  powershell -NoProfile -Command ^
    "$envFile = '%ENV_FILE%'; ^
     $lines = Get-Content $envFile; ^
     $updated = $lines | ForEach-Object { if ($_ -match '^AUTOMATON_BASE_URL=') { '# AUTOMATON_BASE_URL=' + ($_ -split '=', 2)[1] } else { $_ } }; ^
     $updated | Set-Content $envFile"
  echo AUTOMATON_BASE_URL commented out in %ENV_FILE%.
)

echo Done.
endlocal