@echo off
echo =======================================================
echo Jarvis LiveKit - Windows Defender Exclusion Fix
echo =======================================================
echo.
echo This script requires Administrator privileges.
echo If you didn't right-click and "Run as Administrator", please close this and do so.
echo.
pause

powershell -Command "Add-MpPreference -ExclusionPath 'C:\Users\umiiw\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\av'"
powershell -Command "Add-MpPreference -ExclusionPath '%~dp0'"

echo.
echo Success! PyAV and your project directory are now excluded from Defender blocks.
echo You can now run the LiveKit Voice agent safely.
pause
