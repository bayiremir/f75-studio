@echo off
REM F75 Kontrol'u kaldirir. Ayarlarin (%APPDATA%\F75Kontrol) silinmesini ayrica sorar.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "Get-Process F75Kontrol -ErrorAction SilentlyContinue | Stop-Process -Force;" ^
 "Remove-Item -Recurse -Force \"$env:LOCALAPPDATA\Programs\F75Kontrol\" -ErrorAction SilentlyContinue;" ^
 "foreach ($d in 'Desktop','Programs','Startup') { Remove-Item (Join-Path ([Environment]::GetFolderPath($d)) 'F75 Kontrol.lnk') -ErrorAction SilentlyContinue };" ^
 "if ((Read-Host 'Ayarlar da silinsin mi? (E/H)') -match '^[EeYy]') { Remove-Item -Recurse -Force \"$env:APPDATA\F75Kontrol\" -ErrorAction SilentlyContinue };" ^
 "Write-Host 'F75 Kontrol kaldirildi.' -ForegroundColor Green"
pause
