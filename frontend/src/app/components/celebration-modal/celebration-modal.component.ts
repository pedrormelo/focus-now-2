import { Component, Input, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export type CelebrationType = 'achievement' | 'music' | 'level';

@Component({
    selector: 'app-celebration-modal',
    standalone: true,
    imports: [CommonModule, IonicModule],
    template: `
    <div class="celebration-card text-center text-white" role="dialog" aria-modal="true" #card>
      <canvas #confetti class="confetti-canvas" aria-hidden="true"></canvas>
      <div class="icon-wrap">
        <!-- Inline background-image ensures no global class overrides the gradient -->
     <div class="icon-grad-img"
       [style.--icon-url]="'url(' + iconSrc + ')'"
       [style.backgroundImage]="'linear-gradient(135deg, #FDB000, #FE5D00, #E40063)'"
       aria-hidden="true"></div>
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
      position: relative;
      overflow: hidden;
    }
    .confetti-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .icon-wrap { display:flex; align-items:center; justify-content:center; }
      .icon-grad-img { width: 96px; height: 96px;
        /* Keep a default, but inline style will win if any global tries to override */
        /* background-image: linear-gradient(135deg, #FDB000, #FE5D00, #E40063) !important; */
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        -webkit-mask-image: var(--icon-url);
        mask-image: var(--icon-url);
        -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
        -webkit-mask-position: center; mask-position: center;
        -webkit-mask-size: contain; mask-size: contain;
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
export class CelebrationModalComponent implements AfterViewInit, OnDestroy {
    @Input() type: CelebrationType = 'achievement';

  // Use a non-reserved name; "modal" is reserved by ion-modal
  private modalCtrl = inject(ModalController);

  @ViewChild('confetti', { static: false }) confettiCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('card', { static: false }) cardEl?: ElementRef<HTMLDivElement>;
  private disposeConfetti?: () => void;
  private resizeObserver?: ResizeObserver;

    // Use custom SVGs from assets/conquistas
    get iconSrc(): string {
        switch (this.type) {
            case 'music': return 'assets/conquistas/lucide_music-4.svg';
            case 'level': return 'assets/conquistas/lucide_user-star.svg';
            case 'achievement':
            default: return 'assets/conquistas/ri_medal-line.svg';
        }
    }

  close() { this.modalCtrl.dismiss({ confirmed: true, type: this.type }); }

  async ngAfterViewInit() {
    // Lazy import to avoid increasing main bundle by much if tree-shaken
    const mod = await import('canvas-confetti');
    const canvas = this.confettiCanvas?.nativeElement;
    const card = this.cardEl?.nativeElement;
    if (!canvas || !card) return;

    // Size canvas to card
    const fit = () => {
      const rect = card.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
    };
    fit();

    // Keep canvas sized with card changes
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => fit());
      this.resizeObserver.observe(card);
    }

    const confetti = mod.create(canvas, { resize: false, useWorker: true });
    this.disposeConfetti = () => {
      // canvas-confetti has no explicit destroy; clearing canvas is enough
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Fire a short celebratory burst sequence
    const base = { origin: { y: 0.1 }, decay: 0.9, scalar: 1 } as const;
    confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 45 });
    confetti({ ...base, particleCount: 60, spread: 60, angle: 60, origin: { x: 0, y: 0.2 } });
    confetti({ ...base, particleCount: 60, spread: 60, angle: 120, origin: { x: 1, y: 0.2 } });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.disposeConfetti?.();
  }
}
