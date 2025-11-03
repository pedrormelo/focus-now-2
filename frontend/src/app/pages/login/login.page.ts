import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, LogoComponent]
})
export class LoginPage {
    credentials = {
        email: '',
        senha: ''
    };

    private authService = inject(AuthService);
    private router = inject(Router);
    private toastController = inject(ToastController);
    private loadingController = inject(LoadingController);

    async login() {
        const loading = await this.loadingController.create({
            message: 'Entrando...'
        });
        await loading.present();

        try {
            const success = await this.authService.login(this.credentials.email, this.credentials.senha);
            await loading.dismiss();
            
            if (success) {
                this.router.navigate(['/home']);
            } else {
                const toast = await this.toastController.create({
                    message: 'Email ou senha incorretos',
                    duration: 3000,
                    color: 'danger'
                });
                await toast.present();
            }
        } catch (error) {
            await loading.dismiss();
            const toast = await this.toastController.create({
                message: 'Erro ao fazer login. Tente novamente.',
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
        }
    }

    goToRegister() {
        this.router.navigate(['/register']);
    }

    recoverPassword() {
        this.router.navigate(['/forgot-password']);
    }

    async presentToast(message: string) {
        const toast = await this.toastController.create({
            message,
            duration: 3000
        });
        await toast.present();
    }
}