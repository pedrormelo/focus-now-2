import { Component, OnInit, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';
import { NavController } from '@ionic/angular';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, LogoComponent]
})
export class SettingsPage implements OnInit {
    settings = {
        temaEscuro: false,
        modoAutomatico: true,
        mutar: false
    };
    // UI state for sound settings
    alarmVolumePercent = 100; // 0..100
    vibrateOnEnd = true;
    autoplayOnFocus = false;
    pauseOnBreaks = true;
    preEndWarningSeconds = 5;
    playbackMode: 'sequence' | 'shuffle' | 'repeat-one' = 'sequence';
    timerConfig: { pomodoro: number; shortBreak: number; longBreak: number; longBreakInterval: number } = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4
    };

    private modalController = inject(ModalController);
    private timerService = inject(TimerService);
    private settingsService = inject(SettingsService);
    environment = environment;
    private authService = inject(AuthService);
    private router = inject(Router);
    private toastController = inject(ToastController);
    private nav = inject(NavController);

    ngOnInit() {
        // Subscribe to app settings
        const snap = this.settingsService.getSnapshot();
        this.applySettingsToUI(snap);
        this.settingsService.settings$.subscribe((s) => this.applySettingsToUI({ ...snap, ...s }));
        // Load current timer config to show summary
        try {
            const cfg = this.timerService.getTimerConfig?.();
            if (cfg) {
                this.timerConfig = {
                    pomodoro: Number(cfg.pomodoro) || this.timerConfig.pomodoro,
                    shortBreak: Number(cfg.shortBreak) || this.timerConfig.shortBreak,
                    longBreak: Number(cfg.longBreak) || this.timerConfig.longBreak,
                    longBreakInterval: Number(cfg.longBreakInterval) || this.timerConfig.longBreakInterval
                };
            }
        } catch {}
    }

    // Removed Personalizar button for now; keep hook if reintroduced later

    async saveSettings() {
        this.settingsService.setPartial({
            ...this.settings,
            autoplayOnFocus: this.autoplayOnFocus,
            pauseOnBreaks: this.pauseOnBreaks,
            alarmVolume: this.alarmVolumePercent / 100,
            vibrateOnEnd: this.vibrateOnEnd,
            preEndWarningSeconds: this.preEndWarningSeconds,
            playbackMode: this.playbackMode,
        });
        // Apply mute setting immediately in the running app
        try { this.timerService.setMuted(this.settings.mutar); } catch {}
        try { this.timerService.setAlarmVolume(this.alarmVolumePercent / 100); } catch {}
        try { this.timerService.setVibrateOnEnd(this.vibrateOnEnd); } catch {}
        try { this.timerService.setPreEndWarningSeconds(this.preEndWarningSeconds); } catch {}
        await this.presentToast('Configurações salvas!');
    }

    private applySettingsToUI(s: Required<AppSettings>) {
        this.settings.temaEscuro = !!s.temaEscuro;
        this.settings.modoAutomatico = s.modoAutomatico !== false;
        this.settings.mutar = !!s.mutar;
        this.vibrateOnEnd = s.vibrateOnEnd !== false;
        this.alarmVolumePercent = Math.round((s.alarmVolume ?? 1) * 100);
        this.autoplayOnFocus = !!s.autoplayOnFocus;
        this.pauseOnBreaks = s.pauseOnBreaks !== false;
        this.preEndWarningSeconds = Math.max(0, Math.min(60, Math.floor(s.preEndWarningSeconds ?? 5)));
        this.playbackMode = s.playbackMode || 'sequence';
        // Apply theme immediately
        document.body.classList.toggle('dark', this.settings.temaEscuro);
    }

    // Dev helper: unlock all on the server (non-production only)
    async devUnlockAll() {
        try {
            await this.timerService.devUnlockAll();
            await this.timerService.reloadUnlocks?.();
            await this.presentToast('Todos os sons desbloqueados (dev)');
        } catch {
            await this.presentToast('Falha ao desbloquear (dev)');
        }
    }

    toggleTheme() {
        this.settings.temaEscuro = !this.settings.temaEscuro;
        document.body.classList.toggle('dark', this.settings.temaEscuro);
        this.saveSettings();
    }

    async presentToast(message: string) {
        const toast = await this.toastController.create({
            message,
            duration: 2500,
            color: 'success'
        });
        await toast.present();
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    back() {
        // Try to go back in history; if none, Ionic will handle gracefully
        this.nav.back();
    }
}