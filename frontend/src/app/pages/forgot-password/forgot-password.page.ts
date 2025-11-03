import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage {
  email = '';
  tokenDev: string | null = null;
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private loading = inject(LoadingController);
  private router = inject(Router);

  async submit() {
    const loading = await this.loading.create({ message: 'Enviando...' });
    await loading.present();
    const resp = await this.auth.requestPasswordReset(this.email);
    await loading.dismiss();
    this.tokenDev = resp?.token || null;
    const t = await this.toast.create({
      message: 'Se o email existir, enviamos um link para recuperar a senha.',
      duration: 3000,
      color: 'success'
    });
    await t.present();
  }

  goLogin() { this.router.navigate(['/login']); }
}
