import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

// Standalone component to render a sticky bottom navigation across pages
// Usage: <app-bottom-nav [active]="'timer'"></app-bottom-nav>
// The component is slotted as fixed within ion-content so it sticks to the bottom.
@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, IonicModule, RouterModule],
    host: { slot: 'fixed' },
    template: `
      <div class="pointer-events-auto inset-x-0 bottom-4 mx-auto w-full max-w-3xl pb-5 px-5">
        <div class="grid grid-cols-3 gap-3 rounded-3xl border border-surface-border bg-surface/90 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
          <a class="flex flex-col items-center gap-1 rounded-2xl px-3 py-2"
             [ngClass]="active === 'home' ? 'text-brand-accent' : 'text-text-primary'"
             routerLink="/home" aria-label="Home">
            <ion-icon name="home-outline" class="h-6 w-6"></ion-icon>
          </a>
          <a class="flex flex-col items-center gap-1 rounded-2xl px-3 py-2"
             [ngClass]="active === 'timer' ? 'text-brand-accent' : 'text-text-primary'"
             routerLink="/timer" aria-label="Timer">
            <ion-icon name="timer-outline" class="h-6 w-6"></ion-icon>
          </a>
          <a class="flex flex-col items-center gap-1 rounded-2xl px-3 py-2"
             [ngClass]="active === 'progress' ? 'text-brand-accent' : 'text-text-primary'"
             routerLink="/progress" aria-label="Progress">
            <ion-icon name="ribbon-outline" class="h-6 w-6"></ion-icon>
          </a>
        </div>
      </div>
    `,
    styles: [
        `
    :host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 100; pointer-events: none; }
    /* Container spacing respects safe area */
      :host { padding-bottom: env(safe-area-inset-bottom); }
    `
    ]
})
export class BottomNavComponent {
    @Input() active: 'home' | 'timer' | 'progress' | null = null;
}
