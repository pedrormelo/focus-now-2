# Focus Now - Complete MVP Setup Guide

## Overview

This guide will help you set up a complete Pomodoro timer app with authentication, built using Ionic/Angular frontend and Node.js/MySQL backend.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MySQL** (v8.0 or higher) - or XAMPP for easy setup
3. **Ionic CLI**: `npm install -g @ionic/cli`
4. **Capacitor CLI**: `npm install -g @capacitor/cli`

## Project Structure

```text
focus-now-2cylww/
├── backend/                 # Node.js API server
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies
│   └── .env               # Environment variables
└── frontend/               # Ionic/Angular app
    ├── src/app/
    │   ├── pages/         # App pages
    │   ├── services/      # Angular services
    │   └── guards/        # Route guards
    └── package.json       # Dependencies
```

## Setup Instructions

### 1. Backend Setup

#### Database Setup

1. Install MySQL or start XAMPP
2. Create database: `CREATE DATABASE focusnow`
3. The app will automatically create tables on first run

#### Backend Dependencies

```bash
cd backend
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv nodemailer nodemon
```

#### Environment Configuration

Create `.env` file in backend folder:

```env
PORT=3000
JWT_SECRET=focus-now-super-secret-key-for-development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=focusnow
```

#### Start Backend

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will run on <http://localhost:3000>

### 2. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install @ionic/angular @angular/core @angular/common @angular/router
npm install @capacitor/core @capacitor/cli @capacitor/android
```

#### Fix PowerShell Execution Policy (Windows)

If you get execution policy errors:

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Start Development Server

```bash
ionic serve
```

The app will run on <http://localhost:8100>

### 3. Build for Android

#### Initialize Capacitor

```bash
npx cap init focus-now com.example.focusnow
npx cap add android
```

#### Build and Deploy

```bash
# Build the app
ionic build

# Copy to native project
npx cap copy

# Open in Android Studio
npx cap open android
```

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile (requires auth)

### Timer

- `POST /timer/session` - Save timer session
- `GET /stats` - Get user statistics
- `GET /settings` - Get user settings
- `PUT /settings` - Update user settings

## Features Implemented

### ✅ Authentication System

- User registration and login
- JWT token-based authentication
- Protected routes with guards
- Persistent login sessions

### ✅ Pomodoro Timer

- Focus sessions (25 min default)
- Short breaks (5 min default)
- Long breaks (15 min default)
- Customizable timer durations
- Session tracking and history

### ✅ Progress Tracking

- Daily session statistics
- Total focus time tracking
- Session completion rates
- Achievement system (basic)

### ✅ User Settings

- Custom timer durations
- Notification preferences
- Theme settings
- User profile management

### ✅ Database Persistence

- User accounts and authentication
- Timer session history
- User preferences and settings
- Achievement tracking

## MVP Features Status

### Core Features (✅ Complete)

- [x] User authentication (login/register)
- [x] Pomodoro timer functionality
- [x] Session tracking and statistics
- [x] User settings and preferences
- [x] Database persistence
- [x] REST API endpoints
- [x] Mobile-responsive UI

### Advanced Features (Future)

- [ ] Push notifications
- [ ] Social features (leaderboards)
- [ ] Advanced analytics
- [ ] Calendar integration
- [ ] Team/collaboration features

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Timer Sessions Table

```sql
CREATE TABLE timer_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_type ENUM('focus', 'short_break', 'long_break') NOT NULL,
    planned_duration INT NOT NULL,
    actual_duration INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Settings Table

```sql
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    focus_duration INT DEFAULT 25,
    short_break_duration INT DEFAULT 5,
    long_break_duration INT DEFAULT 15,
    sessions_until_long_break INT DEFAULT 4,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Troubleshooting

### Common Issues

1. **PowerShell Execution Policy**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

2. **Database Connection Error**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Create the database: `CREATE DATABASE focusnow`

3. **CORS Errors**
   - Backend includes CORS middleware
   - Ensure frontend calls correct API URL

4. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear Ionic cache: `ionic cache clear`

### Development Tips

1. **Hot Reload**: Use `ionic serve` for development
2. **API Testing**: Use Postman or similar tool to test endpoints
3. **Database Viewer**: Use phpMyAdmin or MySQL Workbench
4. **Logs**: Check browser console and server logs for errors

## Production Deployment

### Backend Deployment

1. Use environment variables for production settings
2. Enable HTTPS
3. Use production database
4. Implement proper error handling
5. Add rate limiting

### Mobile App Deployment

1. Build release APK: `ionic capacitor build android --prod`
2. Sign the APK for Google Play Store
3. Test on physical devices
4. Submit to app stores

## Next Steps

1. **Test the complete flow**: Register → Login → Use Timer → View Progress
2. **Customize the UI** to match your design requirements
3. **Add notification system** for timer alerts
4. **Implement password recovery** functionality
5. **Add more achievements** and gamification
6. **Deploy to production** environment

This MVP provides a solid foundation for your college assignment and can be extended with additional features as needed.
