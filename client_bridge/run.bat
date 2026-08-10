@echo off
echo Installing requirements...
pip install -r requirements.txt
echo.
echo Starting Jarvis PC Bridge...
python bridge_client.py
pause
