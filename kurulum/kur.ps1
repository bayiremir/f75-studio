# F75 Kontrol otomatik kurulum. Windows PowerShell 5.1 BOM'suz dosyalari ANSI okudugu icin metinler ASCII tutuldu.
$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\F75Kontrol"
$ExePath = Join-Path $InstallDir "F75Kontrol.exe"

function Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [Environment]::GetEnvironmentVariable("Path", "User")
}

function Find-Python {
    foreach ($cmd in @("py", "python")) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        # The Microsoft Store "python" stub lives in WindowsApps and only opens the Store.
        if ($found -and $found.Source -notlike "*WindowsApps*") {
            try {
                $testArgs = if ($cmd -eq "py") { @("-3", "--version") } else { @("--version") }
                & $cmd @testArgs 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) { return $cmd }
            } catch {}
        }
    }
    return $null
}

function New-Shortcut($path, $target) {
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($path)
    $lnk.TargetPath = $target
    $lnk.WorkingDirectory = Split-Path -Parent $target
    $lnk.Save()
}

Write-Host "F75 Kontrol kurulumu basliyor..." -ForegroundColor Green

Step "Python kontrol ediliyor"
$py = Find-Python
if (-not $py) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Python bulunamadi ve winget yok. Python'u https://www.python.org/downloads/ adresinden kurup tekrar deneyin."
    }
    Write-Host "Python bulunamadi, winget ile kuruluyor (birkac dakika surebilir)..."
    winget install --id Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements --scope user
    Refresh-Path
    $py = Find-Python
    if (-not $py) { throw "Python kuruldu ama bulunamadi. Bilgisayari yeniden baslatip kur.bat'i tekrar calistirin." }
}
$pyArgs = if ($py -eq "py") { @("-3") } else { @() }
Write-Host ("Bulundu: " + (& $py @pyArgs --version))

Step "Sanal ortam hazirlaniyor"
$venv = Join-Path $ProjectDir ".venv"
if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) { & $py @pyArgs -m venv $venv }
$vpy = Join-Path $venv "Scripts\python.exe"

Step "Gerekli paketler kuruluyor"
& $vpy -m pip install --upgrade pip --quiet
& $vpy -m pip install -r (Join-Path $ProjectDir "requirements.txt") pyinstaller==6.11.1 --quiet
if ($LASTEXITCODE -ne 0) { throw "Paket kurulumu basarisiz oldu. Internet baglantinizi kontrol edin." }

Step "Uygulama derleniyor (F75Kontrol.exe)"
Push-Location $ProjectDir
try {
    & $vpy -m PyInstaller --noconfirm --onefile --windowed --name F75Kontrol main.py --log-level WARN
    if ($LASTEXITCODE -ne 0) { throw "Derleme basarisiz oldu." }
} finally { Pop-Location }

Step "Dosyalar yerlestiriliyor"
Get-Process F75Kontrol -ErrorAction SilentlyContinue | Stop-Process -Force
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item (Join-Path $ProjectDir "dist\F75Kontrol.exe") $ExePath -Force

$desktop = [Environment]::GetFolderPath("Desktop")
$programs = [Environment]::GetFolderPath("Programs")
New-Shortcut (Join-Path $desktop "F75 Kontrol.lnk") $ExePath
New-Shortcut (Join-Path $programs "F75 Kontrol.lnk") $ExePath
Write-Host "Masaustu ve Baslat menusu kisayollari olusturuldu."

$answer = Read-Host "Windows acilinca F75 Kontrol otomatik baslasin mi? (E/H)"
$startupLnk = Join-Path ([Environment]::GetFolderPath("Startup")) "F75 Kontrol.lnk"
if ($answer -match "^[EeYy]") {
    New-Shortcut $startupLnk $ExePath
    Write-Host "Otomatik baslatma acildi."
} elseif (Test-Path $startupLnk) {
    Remove-Item $startupLnk
}

Write-Host ""
Write-Host "Kurulum tamamlandi! Uygulama: $ExePath" -ForegroundColor Green
Start-Process $ExePath
