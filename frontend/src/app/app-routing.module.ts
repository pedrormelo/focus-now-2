import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },
  { path: 'home', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'timer', loadComponent: () => import('./pages/timer/timer.page').then(m => m.TimerPage) },
  { path: 'progress', loadComponent: () => import('./pages/progress/progress.page').then(m => m.ProgressPage) },
  { path: 'achievements', loadComponent: () => import('./pages/achievements/achievements.page').then(m => m.AchievementsPage) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'sounds', loadComponent: () => import('./pages/sounds/sounds.page').then(m => m.SoundsPage) },
  { path: 'info', loadComponent: () => import('./pages/info/info.page').then(m => m.InfoPage) },
  {
    path: 'tabs',
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