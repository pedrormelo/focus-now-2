import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { CycleDotsComponent } from '../../components/cycle-dots/cycle-dots.component';
import { TimerSettingsModalComponent } from '../../components/timer-settings-modal/timer-settings-modal.component';
import { SessionCompleteModalComponent } from '../../components/session-complete-modal/session-complete-modal.component';
import { CelebrationService } from '../../services/celebration.service';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { AudioService } from '../../services/audio.service';
import { MUSIC_CATALOG } from '../../data/music-catalog';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent, BottomNavComponent, CycleDotsComponent]
})
export class TimerPage implements OnInit, OnDestroy {
  trackTitle: string = '—';
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
  private audio = inject(AudioService);
  private subs: Array<{ unsubscribe: () => void }> = [];
  private sessionModalOpen = false;

  // Dev-only helper flag for showing celebration test buttons
  isDev = !environment.production && !!(environment as any).showCelebrationTester;

  ngOnInit() {
    const snap = this.settings.getSnapshot();
    this.applySettings(snap);
    this.subs.push(this.settings.settings$.subscribe((s) => this.applySettings({ ...snap, ...s })));
    // Reflect current background track in UI
    this.subs.push(this.audio.currentTrack$.subscribe((id) => {
      const t = MUSIC_CATALOG.find(x => x.id === id);
      this.trackTitle = t ? `${t.title} - ${t.artist}` : (id || '—');
    }));
    // Show a completion modal when a session completes (optional)
    this.subs.push(this.timerService.completed$.subscribe(async (phase) => {
      const show = this.settings.getSnapshot().showCompletionModal;
      if (!show) return;
      if (this.sessionModalOpen) return; // guard against duplicates
      this.sessionModalOpen = true;
      // Hold celebration queue so the session-complete modal shows first
      try { (this.celebrate as any).holdQueue?.(); } catch {}
      const modal = await this.modalCtrl.create({
        component: SessionCompleteModalComponent,
        componentProps: { phase },
        cssClass: 'session-complete-modal'
      });
      await modal.present();
      try {
        await modal.onDidDismiss();
      } finally {
        this.sessionModalOpen = false;
        // Release celebration queue to show any pending celebrations afterwards
        try { (this.celebrate as any).releaseQueue?.(); } catch {}
      }
    }));
  }

  ngOnDestroy(): void {
    try { this.subs.forEach(s => { try { s.unsubscribe(); } catch {} }); } catch {}
    this.subs = [];
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
  get isMusicPlaying(): boolean { return this.audio.isBackgroundPlaying(); }

  goHome() { this.router.navigate(['/home']); }
  goProgress() { this.router.navigate(['/progress']); }
  openSettings() { this.router.navigate(['/settings']); }
  openSounds() { this.router.navigate(['/sounds']); }
  toggleMute() { this.timerService.setMuted(!this.isMuted); }
  toggleMusic() {
    if (this.audio.isBackgroundPlaying()) {
      this.audio.pauseBackground();
      return;
    }
    if (this.audio.isBackgroundPaused()) {
      this.audio.resumeBackground();
      return;
    }
    // If nothing has started yet, kick off playlist using current settings
    const snap = this.settings.getSnapshot();
    this.audio.setPlaybackMode(snap.playbackMode || 'sequence');
    this.audio.setMuted(!!snap.mutar);
    this.audio.setVolume(snap.alarmVolume ?? 1);
    const playlist = this.timerService.getPlaylist();
    if (playlist && playlist.length) this.audio.playPlaylist(playlist);
  }

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