import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class LoginPage implements OnInit {
    credentials = {
        email: '',
        senha: ''
    };

    constructor(
        private authService: AuthService,
        private router: Router,
        private toastController: ToastController,
        private loadingController: LoadingController
    ) { }

    ngOnInit() { }

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
        // Implementar recuperação de senha
        this.presentToast('Funcionalidade em desenvolvimento');
    }

    async presentToast(message: string) {
        const toast = await this.toastController.create({
            message,
            duration: 3000
        });
        await toast.present();
    }
}