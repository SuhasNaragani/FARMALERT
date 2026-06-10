@echo off
echo Starting FarmAlert Backend...
call venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000
pause
