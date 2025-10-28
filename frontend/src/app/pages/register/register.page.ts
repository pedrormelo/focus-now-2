import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
    selector: 'app-register',
    templateUrl: './register.page.html',
    styleUrls: ['./register.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, LogoComponent]
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

    objectiveCards = [
        { value: 'Gerir meu Tempo', label: 'Gerir meu Tempo', icon: 'assets/icons/objectives/hourglass.svg' },
        { value: 'Focar nos Estudos', label: 'Focar nos Estudos', icon: 'assets/icons/objectives/notebook-pen.svg' },
        { value: 'Melhorar Minha Saúde Mental', label: 'Melhorar Minha Saúde Mental', icon: 'assets/icons/objectives/brain.svg' },
        { value: 'Me Distrair Menos', label: 'Me Distrair Menos', icon: 'assets/icons/objectives/pointer-off.svg' }
    ];

    // Password strength and requirements
    passwordRequirements = {
        length: false,
        letter: false,
        number: false,
        special: false
    };
    passwordStrength = 0; // 0..5

    private authService = inject(AuthService);
    private router = inject(Router);
    private toastController = inject(ToastController);
    private loadingController = inject(LoadingController);

    onPasswordInput(pwd: string) {
        const length = pwd.length >= 8;
        const letter = /[A-Za-z]/.test(pwd);
        const number = /\d/.test(pwd);
        const special = /[^A-Za-z0-9]/.test(pwd);
        this.passwordRequirements = { length, letter, number, special };

        let score = 0;
        if (length) score++;
        if (letter) score++;
        if (number) score++;
        if (special) score++;
        if (pwd.length >= 12) score++; // bonus for extra length
        this.passwordStrength = Math.min(score, 5);
    }

    get passwordStrengthClass(): string {
        switch (this.passwordStrength) {
            case 0:
            case 1:
                return 'weak';
            case 2:
            case 3:
                return 'medium';
            case 4:
                return 'strong';
            case 5:
                return 'very-strong';
            default:
                return 'weak';
        }
    }

    isPasswordValid(): boolean {
        const r = this.passwordRequirements;
        return r.length && r.letter && r.number && r.special;
    }

    selectObjective(value: string) {
        this.userData.objetivo = value;
    }

    async register() {
        const loading = await this.loadingController.create({
            message: 'Criando conta...'
        });
        await loading.present();

        try {
            if (!this.isPasswordValid()) {
                await loading.dismiss();
                const t = await this.toastController.create({
                    message: 'A senha deve ter no mínimo 8 caracteres, letras, números e um caractere especial.',
                    duration: 3500,
                    color: 'warning'
                });
                await t.present();
                return;
            }
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