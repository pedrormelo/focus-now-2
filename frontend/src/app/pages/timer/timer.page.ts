import { Component, OnInit, OnDestroy } from '@angular/core';
import { TimerService } from '../../services/timer.service';
import { Subscription, timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { CycleDotsComponent } from '../../components/cycle-dots/cycle-dots.component';
import { TimerSettingsModalComponent } from '../../components/timer-settings-modal/timer-settings-modal.component';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent, BottomNavComponent, CycleDotsComponent]
})
export class TimerPage implements OnInit, OnDestroy {
  currentTime: number = 25 * 60;
  timerType: 'pomodoro' | 'shortBreak' | 'longBreak' = 'pomodoro';
  isRunning: boolean = false;
  private timerSubscription: Subscription | null = null;
  trackTitle: string = 'Quiet Resource - Evelyn';
  completedCycles = 0;

  // Circle drawing
  readonly radius = 90;
  readonly stroke = 14;
  readonly circumference = 2 * Math.PI * this.radius;

  constructor(private timerService: TimerService, private router: Router, private modalCtrl: ModalController) { }

  ngOnInit() {
    this.resetTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerSubscription = timer(0, 1000).subscribe(() => {
        if (this.currentTime > 0) {
          this.currentTime--;
        } else {
          this.timerComplete();
        }
      });
    }
  }

  pauseTimer() {
    this.isRunning = false;
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  stopTimer() {
    this.pauseTimer();
    this.resetTimer();
  }

  resetTimer() {
    const config = this.timerService.getTimerConfig();
    switch (this.timerType) {
      case 'pomodoro':
        this.currentTime = config.pomodoro * 60;
        break;
      case 'shortBreak':
        this.currentTime = config.shortBreak * 60;
        break;
      case 'longBreak':
        this.currentTime = config.longBreak * 60;
        break;
    }
  }

  timerComplete() {
    this.pauseTimer();

    // Map tipo to backend expected values and save duration in minutes
    const tipoBackend = this.mapTipoToBackend(this.timerType);
    const minutos = Math.round(this.totalSeconds / 60);
    this.timerService.saveCiclo({
      tipo: tipoBackend,
      duracao: minutos,
      completado: true
    }).subscribe();

    // Contabiliza ciclo de foco concluído
    if (this.timerType === 'pomodoro') {
      this.completedCycles = (this.completedCycles + 1);
    }

    // Próximo ciclo automático
    this.nextCycle();
  }

  nextCycle() {
    if (this.timerType === 'pomodoro') {
      // Alternar entre pausas
      this.timerType = 'shortBreak'; // Simplificado
    } else {
      this.timerType = 'pomodoro';
    }
    this.resetTimer();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  get totalSeconds(): number {
    const cfg = this.timerService.getTimerConfig();
    if (this.timerType === 'pomodoro') return cfg.pomodoro * 60;
    if (this.timerType === 'shortBreak') return cfg.shortBreak * 60;
    return cfg.longBreak * 60;
  }

  get progress(): number {
    const total = this.totalSeconds;
    const elapsed = Math.max(0, total - this.currentTime);
    return total > 0 ? elapsed / total : 0;
  }

  get dashOffset(): number {
    return this.circumference * (1 - this.progress);
  }

  get titleText(): string {
    return this.timerType === 'pomodoro' ? 'Hora de Focar' : 'Hora da Pausa';
  }

  private mapTipoToBackend(t: 'pomodoro' | 'shortBreak' | 'longBreak'): 'foco' | 'pausa_curta' | 'pausa_longa' {
    if (t === 'pomodoro') return 'foco';
    if (t === 'shortBreak') return 'pausa_curta';
    return 'pausa_longa';
  }

  goHome() { this.router.navigate(['/home']); }
  goProgress() { this.router.navigate(['/progress']); }
  openSettings() { this.router.navigate(['/settings']); }

  async openTimerSettings() {
    const current = this.timerService.getTimerConfig();
    const modal = await this.modalCtrl.create({
      component: TimerSettingsModalComponent,
      componentProps: { config: current },
      cssClass: 'timer-settings-modal'
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (data) {
      this.timerService.updateTimerConfig(data);
      this.resetTimer();
    }
  }
}