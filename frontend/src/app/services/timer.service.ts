import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TimerService {
    private apiUrl = 'http://localhost:3000/api';

    private timerConfig = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4
    };

    private currentTimer = new BehaviorSubject<any>(null);

    constructor(private http: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('focus_now_token');
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    startTimer(tipo: string, duracao: number) {
        const timer = {
            tipo,
            duracao,
            startTime: new Date(),
            running: true
        };
        this.currentTimer.next(timer);
    }

    stopTimer() {
        const current = this.currentTimer.value;
        if (current) {
            current.running = false;
            this.currentTimer.next(current);
        }
    }

    saveCiclo(cicloData: any) {
        return this.http.post(`${this.apiUrl}/ciclos`, cicloData, { headers: this.getAuthHeaders() });
    }

    getHistorico() {
        return this.http.get(`${this.apiUrl}/historico`, { headers: this.getAuthHeaders() });
    }

    getEstatisticas() {
        return this.http.get(`${this.apiUrl}/estatisticas`, { headers: this.getAuthHeaders() });
    }

    getTimerConfig() {
        return { ...this.timerConfig };
    }

    updateTimerConfig(config: any) {
        this.timerConfig = { ...this.timerConfig, ...config };
    }
}