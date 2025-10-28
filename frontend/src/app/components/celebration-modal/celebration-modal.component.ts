import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export type CelebrationType = 'achievement' | 'music' | 'level';

@Component({
  selector: 'app-celebration-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="celebration-card text-center text-white" role="dialog" aria-modal="true">
      <div class="icon-wrap">
        <ion-icon [name]="iconName" class="icon-grad" aria-hidden="true"></ion-icon>
      </div>

      <div class="title">Parabéns!!</div>
      <div class="message">
        <ng-container [ngSwitch]="type">
          <div *ngSwitchCase="'achievement'">
            Você acaba de alcançar uma <strong>Conquista</strong>!
            <span class="hint">Cheque a aba de <strong>Progresso</strong> para ver suas estatísticas!</span>
          </div>
          <div *ngSwitchCase="'music'">
            Você acaba de desbloquear uma <strong>Música</strong>!
            <span class="hint">Cheque a aba de <strong>Progresso</strong> para ver suas estatísticas!</span>
          </div>
          <div *ngSwitchCase="'level'">
            Você acaba de subir de <strong>Nível</strong>!
            <span class="hint">Cheque a aba de <strong>Progresso</strong> para ver suas estatísticas!</span>
          </div>
        </ng-container>
      </div>

      <div class="actions">
        <button class="btn-pill" (click)="close()">Entendido!</button>
      </div>
    </div>
  `,
  styles: [`
    .celebration-card {
      margin: 0 auto; max-width: 480px; width: 92vw;
      background: rgba(0,0,0,0.55);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 28px;
      padding: 32px 22px 24px;
      backdrop-filter: blur(6px);
      box-shadow: 0 30px 80px rgba(0,0,0,.5);
    }
    .icon-wrap { display:flex; align-items:center; justify-content:center; }
    .icon-grad { font-size: 96px; line-height: 1; 
      background: linear-gradient(135deg, #ffb04c, #ff6a00);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 6px 16px rgba(255, 140, 0, .28));
    }
    .title { margin-top: 14px; font-size: 22px; font-weight: 800; }
    .message { margin-top: 10px; font-size: 16px; line-height: 1.5; padding: 0 12px; }
    .message .hint { display:block; margin-top: 8px; opacity: .9; }
    .actions { margin-top: 18px; display:flex; align-items:center; justify-content:center; }
    .btn-pill {
      display:inline-flex; align-items:center; justify-content:center;
      padding: 12px 20px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.5);
      background: rgba(255,255,255,0.06); color: #fff; font-weight: 600;
    }
    .btn-pill:active { transform: translateY(1px); }
  `]
})
export class CelebrationModalComponent {
  @Input() type: CelebrationType = 'achievement';

  private modal = inject(ModalController);

  get iconName(): string {
    switch (this.type) {
      case 'music': return 'musical-notes-outline';
      case 'level': return 'star-outline';
      case 'achievement':
      default: return 'medal-outline';
    }
  }

  close() { this.modal.dismiss({ confirmed: true, type: this.type }); }
}
