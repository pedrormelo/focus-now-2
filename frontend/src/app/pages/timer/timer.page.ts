import { Component, OnInit, OnDestroy } from '@angular/core';
import { TimerService } from '../../services/timer.service';
import { Subscription, timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.page.html',
  styleUrls: ['./timer.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class TimerPage implements OnInit, OnDestroy {
  currentTime: number = 25 * 60;
  timerType: string = 'pomodoro';
  isRunning: boolean = false;
  private timerSubscription: Subscription | null = null;

  constructor(private timerService: TimerService) { }

  ngOnInit() {
    this.resetTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerSubscription = timer(0, 1000).subscribe(() => {
        if (this.currentTime > 0) {
          this.currentTime--;
        } else {
          this.timerComplete();
        }
      });
    }
  }

  pauseTimer() {
    this.isRunning = false;
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  stopTimer() {
    this.pauseTimer();
    this.resetTimer();
  }

  resetTimer() {
    const config = this.timerService.getTimerConfig();
    switch (this.timerType) {
      case 'pomodoro':
        this.currentTime = config.pomodoro * 60;
        break;
      case 'shortBreak':
        this.currentTime = config.shortBreak * 60;
        break;
      case 'longBreak':
        this.currentTime = config.longBreak * 60;
        break;
    }
  }

  timerComplete() {
    this.pauseTimer();

    // Salvar ciclo completado
    this.timerService.saveCiclo({
      tipo: this.timerType,
      duracao: this.currentTime,
      completado: true
    }).subscribe();

    // Próximo ciclo automático
    this.nextCycle();
  }

  nextCycle() {
    if (this.timerType === 'pomodoro') {
      // Alternar entre pausas
      this.timerType = 'shortBreak'; // Simplificado
    } else {
      this.timerType = 'pomodoro';
    }
    this.resetTimer();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}