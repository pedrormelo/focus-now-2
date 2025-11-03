import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { SettingsService } from '../../services/settings.service';
import { TimerService } from '../../services/timer.service';

@Component({
  selector: 'app-session-complete-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './session-complete-modal.component.html',
  styleUrls: ['./session-complete-modal.component.scss']
})
export class SessionCompleteModalComponent {
  @Input() phase: 'pomodoro' | 'shortBreak' | 'longBreak' = 'pomodoro';
  private modalCtrl = inject(ModalController);
  private settings = inject(SettingsService);
  private timer = inject(TimerService);

  get title(): string {
    return this.phase === 'pomodoro' ? 'Foco concluído' : 'Pausa concluída';
  }
  get message(): string {
    return this.phase === 'pomodoro' ? 'Hora de respirar — sua pausa começou.' : 'Pausa concluída — vamos focar?';
  }
  get autoMode(): boolean { return this.settings.getSnapshot().modoAutomatico !== false; }

  close() {
    this.modalCtrl.dismiss();
  }

  startNextNow() {
    // Start the next session immediately (works when auto-mode is off)
    try { this.timer.start(); } catch {}
    this.close();
  }
}
