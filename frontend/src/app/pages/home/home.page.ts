import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class HomePage implements OnInit {
  user: any = {};
  estatisticas: any = {};

  constructor(
    private authService: AuthService,
    private timerService: TimerService,
    private router: Router
  ) { }

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadEstatisticas();
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

  startTimer() {
    this.router.navigate(['/timer']);
  }

  viewProgress() {
    this.router.navigate(['/progress']);
  }

  viewSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}