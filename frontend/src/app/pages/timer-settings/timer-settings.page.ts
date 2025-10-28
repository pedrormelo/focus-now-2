import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
    selector: 'app-timer-settings',
    templateUrl: './timer-settings.page.html',
    styleUrls: ['./timer-settings.page.scss'],
})
export class TimerSettingsPage implements OnInit {
    @Input() config: any;

    timerConfig: {
        pomodoro: number;
        shortBreak: number;
        longBreak: number;
        longBreakInterval: number;
        alarmSound: string;
    } = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        alarmSound: 'Alarme Padrão'
    };

    private numericFields: Array<keyof Omit<TimerSettingsPage['timerConfig'], 'alarmSound'>> = [
        'pomodoro',
        'shortBreak',
        'longBreak',
        'longBreakInterval'
    ];

    alarmSounds = [
        'Alarme Padrão',
        'Sino',
        'Digital',
        'Natureza'
    ];

    private modalController = inject(ModalController);

    ngOnInit(): void {
        if (this.config) {
            this.timerConfig = { ...this.timerConfig, ...this.config };
        }
    }

    save() {
        this.modalController.dismiss(this.timerConfig);
    }

    cancel() {
        this.modalController.dismiss();
    }

    increment(field: 'pomodoro' | 'shortBreak' | 'longBreak' | 'longBreakInterval') {
        const value = this.timerConfig[field];
        this.timerConfig[field] = value + 1;
    }

    decrement(field: 'pomodoro' | 'shortBreak' | 'longBreak' | 'longBreakInterval') {
        const value = this.timerConfig[field];
        if (value > 1) {
            this.timerConfig[field] = value - 1;
        }
    }
}