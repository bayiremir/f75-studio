@echo off
setlocal
REM One-click Windows build → dist\Aula-Control-Portable.exe (+ Setup if Inno is installed)
REM End users should download from GitHub Releases instead of building.

cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Python not found. Install Python 3.12+ from https://www.python.org/downloads/
  echo Or just download the ready-made exe from:
  echo   https://github.com/bayiremir/f75-studio/releases/latest
  exit /b 1
)

echo [1/3] Installing build dependencies...
python -m pip install -r requirements.txt pyinstaller==6.11.1 || exit /b 1

echo [2/3] Building portable exe with PyInstaller...
python -m PyInstaller --noconfirm AulaControl.spec || exit /b 1

echo [3/3] Building installer (Inno Setup, optional)...
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\aula-control.iss || exit /b 1
  echo.
  echo Setup:    dist\Aula-Control-Setup.exe
) else (
  echo Inno Setup not installed — skipping Setup.exe
  echo Install from https://jrsoftware.org/isinfo.php if you need the installer.
)

echo.
echo Portable: dist\Aula-Control-Portable.exe
echo Done. You can copy that exe to any Windows PC and run it — no Python required.
endlocal
