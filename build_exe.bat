@echo off
REM Tek dosyalik F75Kontrol.exe olusturur (dist\ klasorune).
python -m pip install -r requirements.txt pyinstaller==6.11.1 || exit /b 1
python -m PyInstaller --noconfirm --onefile --windowed --name F75Kontrol main.py || exit /b 1
echo.
echo Hazir: dist\F75Kontrol.exe
