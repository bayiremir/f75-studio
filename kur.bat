@echo off
REM F75 Kontrol'u kurar: gerekirse Python'u yukler, uygulamayi derler, kisayollari olusturur.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kurulum\kur.ps1"
if errorlevel 1 (
    echo.
    echo Kurulum sirasinda bir hata olustu. Yukaridaki mesaji kontrol edin.
)
echo.
pause
