import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-timer-settings-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule],
    template: `
    <div class="mx-auto w-full max-w-md rounded-3xl border border-surface-border bg-surface/95 p-5 text-text-primary shadow-2xl">
      <div class="mb-4 flex items-center gap-3">
        <ion-icon name="time-outline" class="text-brand-accent text-xl"></ion-icon>
        <h2 class="text-xl font-bold">Configurações de Timer</h2>
      </div>

      <div class="text-sm text-text-secondary">Tempo (minutos)</div>

      <!-- Durations grid -->
      <div class="mt-2 grid grid-cols-3 gap-3">
        <div>
          <div class="mb-1 text-sm text-text-secondary">Pomodoro</div>
          <div class="stepper-pill">
            <button class="step-btn" (click)="step('pomodoro', -1)" aria-label="Diminuir Pomodoro">−</button>
            <span class="value">{{ timerConfig.pomodoro }}</span>
            <button class="step-btn" (click)="step('pomodoro', +1)" aria-label="Aumentar Pomodoro">+</button>
          </div>
          <div class="hint">{{ limits.pomodoro.min }}–{{ limits.pomodoro.max }} min</div>
        </div>
        <div>
          <div class="mb-1 text-sm text-text-secondary">Pausa Curta</div>
          <div class="stepper-pill">
            <button class="step-btn" (click)="step('shortBreak', -1)" aria-label="Diminuir Pausa Curta">−</button>
            <span class="value">{{ timerConfig.shortBreak }}</span>
            <button class="step-btn" (click)="step('shortBreak', +1)" aria-label="Aumentar Pausa Curta">+</button>
          </div>
          <div class="hint">{{ limits.shortBreak.min }}–{{ limits.shortBreak.max }} min</div>
        </div>
        <div>
          <div class="mb-1 text-sm text-text-secondary">Pausa Longa</div>
          <div class="stepper-pill">
            <button class="step-btn" (click)="step('longBreak', -1)" aria-label="Diminuir Pausa Longa">−</button>
            <span class="value">{{ timerConfig.longBreak }}</span>
            <button class="step-btn" (click)="step('longBreak', +1)" aria-label="Aumentar Pausa Longa">+</button>
          </div>
          <div class="hint">{{ limits.longBreak.min }}–{{ limits.longBreak.max }} min</div>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-1 flex items-center gap-2 text-sm text-text-secondary">
          <ion-icon name="repeat-outline"></ion-icon>
          <span>Intervalo de Pausa Longa (ciclos)</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="inline-block">
            <div class="stepper-pill w-28">
              <button class="step-btn" (click)="step('longBreakInterval', -1)" aria-label="Diminuir Intervalo">−</button>
              <span class="value">{{ timerConfig.longBreakInterval }}</span>
              <button class="step-btn" (click)="step('longBreakInterval', +1)" aria-label="Aumentar Intervalo">+</button>
            </div>
            <div class="hint text-center">{{ limits.longBreakInterval.min }}–{{ limits.longBreakInterval.max }} ciclos</div>
          </div>
          <div class="text-xs text-text-secondary">
            Após <span class="font-semibold">{{ timerConfig.longBreakInterval }}</span> ciclos de pomodoro, inicia-se uma <span class="font-semibold">pausa longa</span>.
          </div>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-1 text-sm text-text-secondary">Som do Alarme</div>
        <ion-select interface="popover" fill="solid" [(ngModel)]="selectedAlarm" class="pill-select w-full">
          <ion-select-option *ngFor="let opt of alarmOptions" [value]="opt.value">{{ opt.label }}</ion-select-option>
        </ion-select>
      </div>

      <div class="mt-6 flex justify-center">
        <button class="rounded-2xl bg-text-secondary/30 px-8 py-3 text-base font-semibold text-text-primary" (click)="close()">Ok</button>
      </div>
    </div>
  `,
    styles: [
        `
    .stepper-pill { display:flex; align-items:center; justify-content:space-between; gap:.5rem; border:1px solid #373737; background: #323232; border-radius: 1rem; padding: .5rem; height: 48px; }
    .stepper-pill .value { flex: 1 1 auto; text-align:center; font-weight: 600; }
    .stepper-pill .step-btn { width: 28px; height: 28px; border-radius: 9999px; background: rgba(255,255,255,0.08); color: #fff; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; }
    .hint { margin-top: .25rem; font-size: .75rem; color: #D6D6D6; opacity:.7; }
    /* Fix styling using CSS parts to avoid double borders and odd clipping */
    ion-select.pill-select { display:block; --background: transparent; --color:#fff; --placeholder-color:#fff; --placeholder-opacity:1; }
    ion-select.pill-select::part(container) { background:#323232; border:1px solid #373737; border-radius: 9999px; height:48px; padding:0 12px; }
    ion-select.pill-select::part(text), ion-select.pill-select::part(placeholder) { color:#fff; font-weight:500; }
    ion-select.pill-select::part(icon) { color:#D6D6D6; opacity:.9; }
    ion-select.pill-select:focus-visible { outline: none; }
    `
    ]
})
export class TimerSettingsModalComponent implements OnInit {
    @Input() config?: {
        pomodoro: number; shortBreak: number; longBreak: number; longBreakInterval: number;
    };

    timerConfig = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4
    };

    // Bind to SettingsService alarmSound values
    selectedAlarm: 'bell' | 'digital' | 'security' | 'beep' = 'bell';
    alarmOptions = [
      { value: 'bell' as const, label: 'Sino' },
      { value: 'digital' as const, label: 'Digital' },
      { value: 'security' as const, label: 'Alarme' },
      { value: 'beep' as const, label: 'Beep (Sintético)' }
    ];

  private modalCtrl = inject(ModalController);
  private settings = inject(SettingsService);

    ngOnInit() {
        if (this.config) {
            this.timerConfig = { ...this.timerConfig, ...this.config };
        }
    // Initialize alarm selection from app settings
    try {
      const snap = this.settings.getSnapshot();
      this.selectedAlarm = snap.alarmSound || 'bell';
    } catch {}
    }

    close() {
    // Persist alarm selection into global settings
    try { this.settings.setPartial({ alarmSound: this.selectedAlarm }); } catch {}
    this.modalCtrl.dismiss(this.timerConfig);
    }

    // Limits for each numeric field
    limits = {
      pomodoro: { min: 1, max: 120 },
      shortBreak: { min: 1, max: 30 },
      longBreak: { min: 5, max: 60 },
      longBreakInterval: { min: 2, max: 12 }
    } as const;

    step(field: 'pomodoro'|'shortBreak'|'longBreak'|'longBreakInterval', delta: number) {
      const bounds = this.limits[field];
      const next = (this.timerConfig as any)[field] + delta;
      (this.timerConfig as any)[field] = this.clamp(next, bounds.min, bounds.max);
    }

    private clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
}
