import { Component, OnInit, inject } from '@angular/core';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { CycleDotsComponent } from '../../components/cycle-dots/cycle-dots.component';
import { TimerSettingsModalComponent } from '../../components/timer-settings-modal/timer-settings-modal.component';
import { CelebrationService } from '../../services/celebration.service';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent, BottomNavComponent, CycleDotsComponent]
})
export class TimerPage implements OnInit {
  trackTitle: string = 'Quiet Resource - Evelyn';
  get completedCycles() { return this.timerService.completedCycles; }
  // Auto mode and long-break tracking
  autoMode = true;

  // Circle drawing
  readonly radius = 90;
  readonly stroke = 14;
  readonly circumference = 2 * Math.PI * this.radius;

  private timerService = inject(TimerService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private celebrate = inject(CelebrationService);
  private settings = inject(SettingsService);

  // Dev-only helper flag for showing celebration test buttons
  isDev = !environment.production && !!(environment as any).showCelebrationTester;

  ngOnInit() {
    const snap = this.settings.getSnapshot();
    this.applySettings(snap);
    this.settings.settings$.subscribe((s) => this.applySettings({ ...snap, ...s }));
  }


  startTimer() { this.timerService.start(); }

  pauseTimer() { this.timerService.pause(); }

  stopTimer() { this.timerService.stop(); }

  // Next cycle logic is handled by the service

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  get totalSeconds(): number { return this.timerService.totalSeconds; }

  get progress(): number {
    const total = this.totalSeconds;
    const elapsed = Math.max(0, total - this.timerService.currentTime);
    return total > 0 ? elapsed / total : 0;
  }

  get dashOffset(): number {
    return this.circumference * (1 - this.progress);
  }

  get titleText(): string {
    return this.timerService.timerType === 'pomodoro' ? 'Hora de Focar' : 'Hora da Pausa';
  }

  get gradientId(): 'gradPomodoro' | 'gradShort' | 'gradLong' {
    const t = this.timerService.timerType;
    if (t === 'shortBreak') return 'gradShort';
    if (t === 'longBreak') return 'gradLong';
    return 'gradPomodoro';
  }

  get currentTime(): number { return this.timerService.currentTime; }
  get isRunning(): boolean { return this.timerService.isRunning; }
  get isMuted(): boolean { return this.timerService.isMuted; }

  goHome() { this.router.navigate(['/home']); }
  goProgress() { this.router.navigate(['/progress']); }
  openSettings() { this.router.navigate(['/settings']); }
  openSounds() { this.router.navigate(['/sounds']); }
  toggleMute() { this.timerService.setMuted(!this.isMuted); }

  // --- Dev celebration testers ---
  testAchievement() { if (this.isDev) this.celebrate.celebrateAchievement(); }
  testMusic() { if (this.isDev) this.celebrate.celebrateMusicUnlocked(); }
  testLevel() { if (this.isDev) this.celebrate.celebrateLevelUp(); }

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
      this.timerService.setType(this.timerService.timerType);
    }
  }

  private applySettings(s: Required<AppSettings>) {
    this.autoMode = s.modoAutomatico !== false;
  }
}