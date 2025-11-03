import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage) },
  { path: 'home', canMatch: [AuthGuard], loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'timer', canMatch: [AuthGuard], loadComponent: () => import('./pages/timer/timer.page').then(m => m.TimerPage) },
  { path: 'progress', canMatch: [AuthGuard], loadComponent: () => import('./pages/progress/progress.page').then(m => m.ProgressPage) },
  { path: 'achievements', canMatch: [AuthGuard], loadComponent: () => import('./pages/achievements/achievements.page').then(m => m.AchievementsPage) },
  { path: 'settings', canMatch: [AuthGuard], loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'sounds', canMatch: [AuthGuard], loadComponent: () => import('./pages/sounds/sounds.page').then(m => m.SoundsPage) },
  { path: 'info', loadComponent: () => import('./pages/info/info.page').then(m => m.InfoPage) },
  {
    path: 'tabs',
    canMatch: [AuthGuard],
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }