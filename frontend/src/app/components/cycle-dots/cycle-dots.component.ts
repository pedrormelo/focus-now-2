import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-cycle-dots',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex items-center justify-center gap-5">
      <ng-container *ngFor="let i of dotArray; index as idx">
        <span
          class="inline-block h-4 w-4 rounded-full"
          [ngClass]="idx < completedClamped ? 'bg-gradient-to-r from-brand-gradientStart to-brand-gradientEnd' : 'bg-white/30'"
        ></span>
      </ng-container>
    </div>
  `
})
export class CycleDotsComponent {
    @Input() total = 4;
    @Input() completed = 0;

    get completedClamped(): number {
        if (this.total <= 0) return 0;
        // wrap every 'total' cycles (e.g., 4) so it resets visually
        return Math.max(0, Math.min(this.total, this.completed % (this.total + 1)));
    }

    get dotArray() {
        return Array.from({ length: Math.max(0, this.total) }, (_, i) => i);
    }
}
