import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent, BottomNavComponent]
})
export class HomePage implements OnInit, OnDestroy {
  user: any = {};
  estatisticas: any = {};
  currentStreak = 0;
  private userSub?: any;

  private authService = inject(AuthService);
  private timerService = inject(TimerService);
  private router = inject(Router);

  ngOnInit() {
    // Live user info (xp/nivel)
    this.userSub = this.authService.currentUser$.subscribe(u => { this.user = u || {}; });
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadEstatisticas();
    this.loadStreak();
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe?.();
  }

  loadEstatisticas() {
    this.timerService.getEstatisticas().subscribe({
      next: (stats: any) => {
        this.estatisticas = stats;
      },
      error: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
  }

  loadStreak() {
    this.timerService.getStreak().subscribe({
      next: (s: any) => {
        this.currentStreak = s?.currentStreak || 0;
      },
      error: (error) => {
        console.error('Erro ao carregar streak:', error);
        this.currentStreak = 0;
      }
    });
  }

  startTimer() {
    this.router.navigate(['/timer']);
  }

  viewProgress() {
    this.router.navigate(['/progress']);
  }

  viewSettings() {
    this.router.navigate(['/settings']);
  }

  viewInfo() {
    this.router.navigate(['/info']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}