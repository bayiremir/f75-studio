# -*- mode: python ; coding: utf-8 -*-
# pyinstaller AulaControl.spec
from PyInstaller.building.api import COLLECT, EXE, PYZ
from PyInstaller.building.build_main import Analysis
from PyInstaller.utils.hooks import collect_dynamic_libs

block_cipher = None
try:
    hid_bins = collect_dynamic_libs("hidapi")
except Exception:
    hid_bins = []

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=hid_bins,
    datas=[],
    hiddenimports=["hid"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="Aula-Control-Portable",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    # UPX packing often triggers Windows Defender false positives on unsigned builds.
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
