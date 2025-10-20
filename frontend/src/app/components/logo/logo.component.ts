import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
    selector: 'app-logo',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="app-logo" [ngClass]="variant" [style.gap.px]="gapNumber" [style.height.px]="heightNumber">
      <img
        class="logo-icon"
        [src]="iconSrc"
        [alt]="alt || 'FocusNow Logo'"
        [style.height.px]="heightNumber"
        [style.display]="'block'"
      />
      <div *ngIf="showText" class="logo-text" [style.fontSize.px]="fontSizeNumber" [style.line-height.px]="heightNumber">
        <span class="focus">{{ focusText }}</span><span class="now">{{ nowText }}</span>
      </div>
    </div>
  `,
    styles: [
        `
    .app-logo { display: inline-flex; align-items: center; }
    .logo-icon { display: block; }
    .logo-text { font-family: var(--app-font-family, 'Montserrat', Arial, sans-serif); color: currentColor; white-space: nowrap; }
    .logo-text .focus { font-weight: 400; }
    .logo-text .now { font-weight: 600; }
    .app-logo.light .logo-icon { filter: none; }
    .app-logo.dark .logo-icon { filter: invert(1) grayscale(100%); }
    `
    ]
})
export class LogoComponent {
    /** Icon source. Defaults to icon-only SVG to allow text rendering alongside */
    @Input() src?: string; // deprecated alias
    @Input() icon?: string;
    @Input() alt?: string;
    /** Overall icon height in px */
    @Input() height: number | string = 48;
    /** Space between icon and text */
    @Input() gap: number | string = 12;
    /** Optional font size override in px for wordmark; defaults to ~62% of height */
    @Input() fontSize?: number | string;
    /** Show wordmark text to the right of the icon */
    @Input() showText = true;
    /** Text parts */
    @Input() focusText = 'Focus';
    @Input() nowText = 'Now';
    /** Visual variant */
    @Input() variant: 'light' | 'dark' = 'light';

    get heightNumber(): number {
        const n = typeof this.height === 'string' ? parseInt(this.height, 10) : this.height;
        return isNaN(n as number) ? 48 : (n as number);
    }
    get gapNumber(): number {
        const n = typeof this.gap === 'string' ? parseInt(this.gap, 10) : this.gap;
        return isNaN(n as number) ? 12 : (n as number);
    }
    get fontSizeNumber(): number {
        if (this.fontSize !== undefined) {
            const n = typeof this.fontSize === 'string' ? parseInt(this.fontSize, 10) : this.fontSize;
            if (!isNaN(n as number)) return n as number;
        }
        return Math.round(this.heightNumber * 0.62);
    }
    get iconSrc(): string {
        return this.icon || this.src || 'assets/logo.svg';
    }
}

