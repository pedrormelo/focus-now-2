@echo off
echo ========================================
echo Focus Now - Quick Start Script
echo ========================================
echo.

echo Starting MySQL/XAMPP service...
echo Please make sure MySQL is running!
echo.

echo 1. Starting Backend Server...
cd backend
start cmd /k "npm run dev"

echo.
echo 2. Starting Frontend Development Server...
cd ../frontend
start cmd /k "ionic serve"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo Backend API: http://localhost:3000
echo Frontend App: http://localhost:8100
echo ========================================
echo.
echo Press any key to exit...
pause >nul