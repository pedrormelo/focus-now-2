import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss']
})
export class ResetPasswordPage implements OnInit {
  password = '';
  confirm = '';
  token = '';
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private loading = inject(LoadingController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  async submit() {
    if (!this.password || this.password !== this.confirm) {
      const t = await this.toast.create({ message: 'As senhas não conferem', duration: 2500, color: 'danger' });
      await t.present();
      return;
    }
    const loading = await this.loading.create({ message: 'Salvando...' });
    await loading.present();
    const ok = await this.auth.resetPassword(this.token, this.password);
    await loading.dismiss();
    if (ok) {
      const t = await this.toast.create({ message: 'Senha alterada com sucesso', duration: 2500, color: 'success' });
      await t.present();
      this.router.navigate(['/login']);
    } else {
      const t = await this.toast.create({ message: 'Falha ao alterar a senha', duration: 2500, color: 'danger' });
      await t.present();
    }
  }

  goLogin() { this.router.navigate(['/login']); }
}
