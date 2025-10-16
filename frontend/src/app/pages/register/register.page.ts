import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-register',
    templateUrl: './register.page.html',
    styleUrls: ['./register.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class RegisterPage {
    userData = {
        nome: '',
        email: '',
        senha: '',
        objetivo: ''
    };

    objetivos = [
        'Gerir meu Tempo',
        'Focar nos Estudos',
        'Melhorar Minha Saúde Mental',
        'Me Distrair Menos'
    ];

    constructor(
        private authService: AuthService,
        private router: Router,
        private toastController: ToastController,
        private loadingController: LoadingController
    ) { }

    async register() {
        const loading = await this.loadingController.create({
            message: 'Criando conta...'
        });
        await loading.present();

        try {
            const success = await this.authService.register(
                this.userData.nome,
                this.userData.email,
                this.userData.senha,
                this.userData.objetivo
            );
            await loading.dismiss();
            
            if (success) {
                const toast = await this.toastController.create({
                    message: 'Conta criada com sucesso! Faça login para continuar.',
                    duration: 3000,
                    color: 'success'
                });
                await toast.present();
                this.router.navigate(['/login']);
            } else {
                const toast = await this.toastController.create({
                    message: 'Erro ao criar conta. Tente novamente.',
                    duration: 3000,
                    color: 'danger'
                });
                await toast.present();
            }
        } catch (error) {
            await loading.dismiss();
            const toast = await this.toastController.create({
                message: 'Erro ao criar conta. Tente novamente.',
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
        }
    }

    goToLogin() {
        this.router.navigate(['/login']);
    }
}