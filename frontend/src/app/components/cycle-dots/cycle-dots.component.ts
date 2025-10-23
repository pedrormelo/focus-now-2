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
          [ngClass]="idx < completedClamped ? 'bg-white' : 'bg-white/30'"
        ></span>
      </ng-container>
    </div>
  `
})
export class CycleDotsComponent {
    @Input() total = 4;
    @Input() completed = 0;

    get completedClamped(): number {
    // Show how many pomodoros are done in the current set, filling all dots
    // during the break after the Nth pomodoro, then resetting on the next set.
    // Behavior:
    // - completed = 0 -> 0
    // - completed = 1..(total-1) -> same value
    // - completed = total (e.g., 4) -> show total (all filled)
    // - completed = total + 1 -> reset to 1, etc.
    const t = Math.max(0, Math.floor(this.total));
    if (t <= 0) return 0;
    const c = Math.max(0, Math.floor(this.completed));
    if (c === 0) return 0;
    const mod = c % t;
    return mod === 0 ? t : mod;
    }

    get dotArray() {
        return Array.from({ length: Math.max(0, this.total) }, (_, i) => i);
    }
}
