import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class SettingsPage implements OnInit {
    settings = {
        temaEscuro: false,
        modoAutomatico: true,
        notificacoes: true,
        mutar: false
    };

    constructor(
        private modalController: ModalController,
        private timerService: TimerService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit() {
        // Carregar configurações salvas
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    async openTimerSettings() {
        // TODO: Implement timer settings modal
        console.log('Timer settings modal not implemented yet');
    }

    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        this.presentToast('Configurações salvas!');
    }

    toggleTheme() {
        this.settings.temaEscuro = !this.settings.temaEscuro;
        document.body.classList.toggle('dark', this.settings.temaEscuro);
        this.saveSettings();
    }

    async presentToast(message: string) {
        // Implementar toast
        console.log(message);
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}