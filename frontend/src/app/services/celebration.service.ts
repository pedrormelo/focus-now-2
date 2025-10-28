import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CelebrationModalComponent, CelebrationType } from '../components/celebration-modal/celebration-modal.component';

@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private modalCtrl = inject(ModalController);
  private queue: CelebrationType[] = [];
  private isPresenting = false;
  private lastShownAt = 0;
  private readonly debounceMs = 300; // avoid double enqueues from quick successive triggers

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
    if (this.isPresenting) return;
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
      await modal.onDidDismiss();
    } finally {
      this.isPresenting = false;
      // Present any remaining items
      if (this.queue.length) this.processQueue();
    }
  }

  celebrateAchievement() { return this.show('achievement'); }
  celebrateMusicUnlocked() { return this.show('music'); }
  celebrateLevelUp() { return this.show('level'); }
}
