import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CelebrationModalComponent, CelebrationType } from '../components/celebration-modal/celebration-modal.component';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private modalCtrl = inject(ModalController);
  private settings = inject(SettingsService);
  private queue: CelebrationType[] = [];
  private isPresenting = false;
  private hold = false; // when true, defer presenting until released
  private lastShownAt = 0;
  private readonly debounceMs = 300; // avoid double enqueues from quick successive triggers
  private idleResolvers: Array<() => void> = [];
  private sfxEl: HTMLAudioElement | null = null;

  // Public API schedules a modal; they will display one at a time in priority order
  async show(type: CelebrationType) {
    this.enqueue(type);
    this.processQueue();
  }

  private enqueue(type: CelebrationType) {
    const now = Date.now();
    // Debounce same-type spamming
    if (now - this.lastShownAt < this.debounceMs && this.queue[this.queue.length - 1] === type) return;
    // If same type already waiting, don't enqueue again
    if (this.queue.includes(type)) return;
    // Push with simple priority: level > music > achievement
    const priority = (t: CelebrationType) => (t === 'level' ? 0 : t === 'music' ? 1 : 2);
    this.queue.push(type);
    this.queue.sort((a, b) => priority(a) - priority(b));
  }

  private async processQueue() {
    if (this.isPresenting || this.hold) return;
    const next = this.queue.shift();
    if (!next) return;
    this.isPresenting = true;
    this.lastShownAt = Date.now();
    try {
      const modal = await this.modalCtrl.create({
        component: CelebrationModalComponent,
        componentProps: { type: next },
        cssClass: 'celebration-modal',
        backdropDismiss: true,
        canDismiss: true,
        showBackdrop: true
      });
      await modal.present();
      // Play celebration SFX on present (respect global mute)
      try {
        const muted = !!this.settings.getSnapshot().mutar;
        if (!muted) {
          const src = 'assets/sounds/achievement/mixkit-achievement-bell-600.wav';
          if (!this.sfxEl) this.sfxEl = new Audio();
          const el = this.sfxEl;
          try { el.pause(); } catch {}
          try { el.currentTime = 0; } catch {}
          el.src = src;
          el.loop = false;
          el.muted = false;
          el.volume = 0.6;
          el.play().catch(() => {});
        }
      } catch { /* ignore */ }
      await modal.onDidDismiss();
    } finally {
      this.isPresenting = false;
      // Present any remaining items
      if (this.queue.length) {
        this.processQueue();
      } else {
        this.resolveIdle();
      }
    }
  }

  celebrateAchievement() { return this.show('achievement'); }
  celebrateMusicUnlocked() { return this.show('music'); }
  celebrateLevelUp() { return this.show('level'); }

  // External consumers can await until celebration queue is fully idle
  whenIdle(opts?: { timeoutMs?: number }): Promise<void> {
    const timeoutMs = Math.max(0, Math.floor(opts?.timeoutMs ?? 0));
    if (!this.isPresenting && this.queue.length === 0) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.idleResolvers.push(resolve);
      if (timeoutMs > 0) {
        const t = setTimeout(() => {
          // Remove this resolver if still pending
          const idx = this.idleResolvers.indexOf(resolve);
          if (idx >= 0) this.idleResolvers.splice(idx, 1);
          reject(new Error('celebration_idle_timeout'));
        }, timeoutMs);
        // Wrap resolve to clear timeout
        const orig = resolve;
        const wrapped = () => { try { clearTimeout(t); } catch {} orig(); };
        const i = this.idleResolvers.length - 1;
        this.idleResolvers[i] = wrapped;
      }
    });
  }

  private resolveIdle() {
    if (this.isPresenting || this.queue.length) return;
    const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length);
    for (const r of resolvers) {
      try { r(); } catch {}
    }
  }

  // Pause presenting new celebration modals; queued items will wait
  holdQueue() { this.hold = true; }
  // Resume presenting queued celebration modals
  releaseQueue() { this.hold = false; this.processQueue(); }
}
