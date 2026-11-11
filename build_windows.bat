@echo off
REM Build Aula-Control-Portable.exe (and Setup.exe if Inno Setup is installed).
python -m pip install -r requirements.txt pyinstaller==6.11.1 || exit /b 1
python -m PyInstaller --noconfirm AulaControl.spec || exit /b 1
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\aula-control.iss || exit /b 1
  echo.
  echo Setup: dist\Aula-Control-Setup.exe
)
echo Portable: dist\Aula-Control-Portable.exe
