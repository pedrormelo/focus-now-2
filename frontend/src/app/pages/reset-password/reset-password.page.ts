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

  get strength() {
    const s = this.computeStrength(this.password);
    const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];
    const colors = [
      'linear-gradient(to right, #ef4444, #f97316)',
      'linear-gradient(to right, #f59e0b, #eab308)',
      'linear-gradient(to right, #10b981, #22c55e)',
      'linear-gradient(to right, #06b6d4, #3b82f6)',
      'linear-gradient(to right, #7c3aed, #8b5cf6)'
    ];
    const textClass = ['text-red-500','text-amber-500','text-emerald-500','text-sky-500','text-violet-500'][s];
    return { score: s, label: labels[s], width: widths[s], bg: colors[s], textClass };
  }

  private computeStrength(pw: string): 0|1|2|3|4 {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    // clamp 0..4
    if (score > 4) score = 4;
    return score as 0|1|2|3|4;
  }

  get requirements() {
    const pw = this.password || '';
    return {
      length: pw.length >= 8,
      letter: /[A-Za-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw)
    };
  }

  isValid(): boolean {
    const r = this.requirements;
    return r.length && r.letter && r.number && r.special && this.password === this.confirm;
  }

  async submit() {
    if (!this.password || this.password !== this.confirm) {
      const t = await this.toast.create({ message: 'As senhas não conferem', duration: 2500, color: 'danger' });
      await t.present();
      return;
    }
    const r = this.requirements;
    if (!(r.length && r.letter && r.number && r.special)) {
      const t = await this.toast.create({ message: 'A senha deve ter no mínimo 8 caracteres, incluir letras, números e um caractere especial.', duration: 3000, color: 'warning' });
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
