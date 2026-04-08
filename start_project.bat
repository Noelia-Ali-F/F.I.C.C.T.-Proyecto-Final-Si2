@echo off
echo Iniciando el proyecto F.I.C.C.T...

echo Iniciando backend Django...
start cmd /k "cd backend-mudanza && call venv\Scripts\activate.bat && python manage.py runserver"

echo Iniciando frontend React...
start cmd /k "cd frontend-mudanza && npm run dev"

echo Proyecto iniciado. Los servidores se están ejecutando en ventanas separadas.