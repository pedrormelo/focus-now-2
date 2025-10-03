# Focus Now - Pomodoro Timer App

A complete Pomodoro timer application built with Ionic/Angular frontend and Node.js/MySQL backend for college assignment.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- MySQL or XAMPP
- Ionic CLI: `npm install -g @ionic/cli`

### 1. Setup Database

```sql
CREATE DATABASE focusnow;
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm install
ionic serve
```

### 4. Build Android APK

```bash
cd frontend
ionic build
npx cap add android
npx cap copy
npx cap open android
```

## 📱 Features

### ✅ Implemented (MVP)

- **Authentication System**
  - User registration and login
  - JWT token authentication
  - Protected routes
  - Session persistence

- **Pomodoro Timer**
  - 25-minute focus sessions
  - 5-minute short breaks
  - 15-minute long breaks
  - Customizable durations

- **Progress Tracking**
  - Session statistics
  - Daily/weekly progress
  - Achievement system
  - History tracking

- **User Settings**
  - Timer customization
  - Theme preferences
  - Notification settings

- **Database Persistence**
  - User accounts
  - Session history
  - Settings storage

### 🔄 Architecture

```text
Frontend (Ionic/Angular)
├── Authentication Service
├── Timer Service
├── API Service
├── Route Guards
└── Responsive UI

Backend (Node.js/Express)
├── JWT Authentication
├── REST API Endpoints
├── MySQL Database
├── Session Tracking
└── User Management
```

## 🛠️ Tech Stack

- **Frontend**: Ionic 7, Angular 16, TypeScript
- **Backend**: Node.js, Express.js, MySQL
- **Authentication**: JWT tokens
- **Mobile**: Capacitor for Android builds
- **Database**: MySQL with auto-created tables

## 📋 API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login  
- `GET /auth/profile` - Get user profile
- `POST /timer/session` - Save session
- `GET /stats` - User statistics
- `GET /settings` - User settings
- `PUT /settings` - Update settings

## 🗂️ Project Structure

```text
focus-now-2cylww/
├── backend/
│   ├── server.js              # Main API server
│   ├── package.json           # Dependencies
│   └── .env                   # Configuration
├── frontend/
│   ├── src/app/
│   │   ├── pages/            # Login, Timer, Progress, Settings
│   │   ├── services/         # Auth, Timer, API services
│   │   └── guards/           # Route protection
│   └── package.json
├── MVP_SETUP_GUIDE.md        # Detailed setup instructions
└── README.md                 # This file
```

## 🚨 Issues Fixed

- ✅ Authentication service simplified (removed Ionic Storage dependency)
- ✅ Route guards working with new auth system
- ✅ All page imports and exports corrected
- ✅ Database schema auto-creation
- ✅ Complete REST API implementation
- ✅ Mobile-responsive UI components

## 🎯 College Assignment Requirements

This project meets all requirements:

- ✅ **Ionic + Angular**: Complete mobile app framework
- ✅ **Node.js Backend**: Express.js REST API server  
- ✅ **Database Persistence**: MySQL with proper schema
- ✅ **Authentication**: Login/register with JWT
- ✅ **Password Recovery**: Basic framework (can be extended)
- ✅ **APK Build**: Capacitor integration ready
- ✅ **MVP Focus**: All core features working

## 🔧 Troubleshooting

### PowerShell Execution Policy (Windows)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Database Connection Issues

- Start MySQL/XAMPP
- Create database: `CREATE DATABASE focusnow`
- Check credentials in `backend/.env`

### Build Errors

```bash
# Clear caches
rm -rf node_modules
npm install
ionic cache clear
```

## 📊 Database Schema

Tables created automatically:

- `users` - User accounts
- `timer_sessions` - Pomodoro sessions
- `user_settings` - User preferences
- `user_achievements` - Achievement tracking

## 🎨 Customization

The app follows your Figma design principles:

- Clean, modern UI
- Intuitive navigation
- Focus-friendly color scheme
- Mobile-first design

## 📝 Development Notes

### For College Submission

1. **Demonstrate core functionality**: Login → Start Timer → View Progress
2. **Show database persistence**: User data survives app restarts
3. **Explain architecture**: Frontend/Backend separation
4. **APK generation**: Ready for Android deployment

### Future Enhancements

- Push notifications for timer alerts
- Social features and leaderboards
- Advanced analytics and insights
- Calendar integration
- Team collaboration features

## 🏁 Final Status

**Ready for submission!** This MVP includes all required features for your college assignment:

- Complete authentication system
- Working Pomodoro timer
- Data persistence
- Mobile app (APK ready)
- Clean, professional code structure
- Comprehensive documentation

The app is production-ready and can be extended with additional features as needed.
