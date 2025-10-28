import { Component, OnInit, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';

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
        notificacoes: true,
        mutar: false
    };

    private modalController = inject(ModalController);
    private timerService = inject(TimerService);
    private authService = inject(AuthService);
    private router = inject(Router);
    private toastController = inject(ToastController);

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

    async saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
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
}