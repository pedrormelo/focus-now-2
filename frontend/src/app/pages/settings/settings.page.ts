import { Component, OnInit, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
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
    timerConfig: { pomodoro: number; shortBreak: number; longBreak: number; longBreakInterval: number } = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4
    };

    private modalController = inject(ModalController);
    private timerService = inject(TimerService);
    private authService = inject(AuthService);
    private router = inject(Router);
    private toastController = inject(ToastController);
    private nav = inject(NavController);

    ngOnInit() {
        // Carregar configurações salvas
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            this.settings = { ...this.settings, ...parsed };
            if (typeof parsed.alarmVolume === 'number') this.alarmVolumePercent = Math.round(parsed.alarmVolume * 100);
            if (typeof parsed.vibrateOnEnd === 'boolean') this.vibrateOnEnd = parsed.vibrateOnEnd;
            if (typeof parsed.autoplayOnFocus === 'boolean') this.autoplayOnFocus = parsed.autoplayOnFocus;
            if (typeof parsed.pauseOnBreaks === 'boolean') this.pauseOnBreaks = parsed.pauseOnBreaks;
            if (typeof parsed.preEndWarningSeconds === 'number') this.preEndWarningSeconds = Math.max(0, Math.min(60, Math.floor(parsed.preEndWarningSeconds)));
        }
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
        // Merge with existing appSettings to preserve unrelated keys
        const existing = localStorage.getItem('appSettings');
        const parsed = existing ? JSON.parse(existing) : {};
        const merged = {
            ...parsed,
            ...this.settings,
            autoplayOnFocus: this.autoplayOnFocus,
            pauseOnBreaks: this.pauseOnBreaks,
            alarmVolume: this.alarmVolumePercent / 100,
            vibrateOnEnd: this.vibrateOnEnd,
            preEndWarningSeconds: this.preEndWarningSeconds
        };
        localStorage.setItem('appSettings', JSON.stringify(merged));
        // Apply mute setting immediately in the running app
        try { this.timerService.setMuted(this.settings.mutar); } catch {}
        try { this.timerService.setAlarmVolume(this.alarmVolumePercent / 100); } catch {}
        try { this.timerService.setVibrateOnEnd(this.vibrateOnEnd); } catch {}
        try { this.timerService.setPreEndWarningSeconds(this.preEndWarningSeconds); } catch {}
        await this.presentToast('Configurações salvas!');
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