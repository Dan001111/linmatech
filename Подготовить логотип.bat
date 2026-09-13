@echo off
rem Launcher for prepare-logo.ps1.
rem Windows cannot run .ps1 files by double-click, so this file does it.
rem
rem Two ways to use it:
rem   - drag logo files onto this file;
rem   - or just double-click it and pick files in the dialog.
rem
rem Keep this file next to prepare-logo.ps1.

chcp 65001 >nul
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0prepare-logo.ps1" %*
