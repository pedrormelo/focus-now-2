import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

type TimerState = {
    currentTime: number;
    totalSeconds: number;
    timerType: 'pomodoro' | 'shortBreak' | 'longBreak';
    isRunning: boolean;
    completedCycles: number;
    cyclesSinceLongBreak: number;
};

@Injectable({
    providedIn: 'root'
})

export class TimerService {
    private apiUrl = 'http://localhost:3000/api';

    private timerConfig = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        alarmSound: 'Alarme Padrão'
    };

    // Persistent timer state across pages
    private state = new BehaviorSubject<TimerState>({ currentTime: this.timerConfig.pomodoro * 60, totalSeconds: this.timerConfig.pomodoro * 60, timerType: 'pomodoro', isRunning: false, completedCycles: 0, cyclesSinceLongBreak: 0 });
    private tickSub: Subscription | null = null;
    private autoMode = true;

    constructor(private http: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('focus_now_token');
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    // Expose readonly observable for components
    state$ = this.state.asObservable();

    // Control methods
    start() {
        const s = this.state.value;
        if (s.isRunning) return;
        this.setState({ isRunning: true });
        if (this.tickSub) this.tickSub.unsubscribe();
        this.tickSub = interval(1000).subscribe(() => {
            const cur = this.state.value;
            if (!cur.isRunning) return;
            if (cur.currentTime > 0) {
                this.setState({ currentTime: cur.currentTime - 1 });
            } else {
                this.onComplete();
            }
        });
    }

    pause() {
        const s = this.state.value;
        if (!s.isRunning) return;
        this.setState({ isRunning: false });
    }

    stop() {
        this.pause();
        this.resetForCurrentType();
    }

    private resetForCurrentType() {
        const cfg = this.timerConfig;
        const cur = this.state.value;
        let total = cfg.pomodoro * 60;
        if (cur.timerType === 'shortBreak') total = cfg.shortBreak * 60;
        if (cur.timerType === 'longBreak') total = cfg.longBreak * 60;
        this.setState({ currentTime: total, totalSeconds: total });
    }

    setType(t: 'pomodoro' | 'shortBreak' | 'longBreak') {
        const cfg = this.timerConfig;
        let total = cfg.pomodoro * 60;
        if (t === 'shortBreak') total = cfg.shortBreak * 60;
        if (t === 'longBreak') total = cfg.longBreak * 60;
        this.setState({ timerType: t, currentTime: total, totalSeconds: total });
    }

    private onComplete() {
        const cur = this.state.value;
        // Save cycle
        const tipoBackend = this.mapTipoToBackend(cur.timerType);
        const minutos = Math.round(cur.totalSeconds / 60);
        this.saveCiclo({ tipo: tipoBackend, duracao: minutos, completado: true }).subscribe();

        // Increment dots after every session
        let completedCycles = cur.completedCycles + 1;
        let cyclesSinceLongBreak = cur.cyclesSinceLongBreak;
        if (cur.timerType === 'pomodoro') cyclesSinceLongBreak += 1;
        this.setState({ completedCycles, cyclesSinceLongBreak });

        // Next cycle (respect long break interval)
        const intervalLB = Math.max(2, this.timerConfig.longBreakInterval || 4);
        let next: 'pomodoro' | 'shortBreak' | 'longBreak' = 'pomodoro';
        if (cur.timerType === 'pomodoro') {
            if (cyclesSinceLongBreak >= intervalLB) {
                next = 'longBreak';
                cyclesSinceLongBreak = 0;
            } else {
                next = 'shortBreak';
            }
        }
        this.setState({ cyclesSinceLongBreak });
        this.setType(next);
        if (this.autoMode) this.start();
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

    getStreak() {
        return this.http.get(`${this.apiUrl}/streak`, { headers: this.getAuthHeaders() });
    }

    getDiasFoco(start?: string, end?: string) {
        const params: string[] = [];
        if (start) params.push(`start=${encodeURIComponent(start)}`);
        if (end) params.push(`end=${encodeURIComponent(end)}`);
        const qs = params.length ? `?${params.join('&')}` : '';
        return this.http.get(`${this.apiUrl}/dias-foco${qs}`, { headers: this.getAuthHeaders() });
    }

    getTimerConfig() {
        return { ...this.timerConfig };
    }

    updateTimerConfig(config: any) {
        this.timerConfig = { ...this.timerConfig, ...config };
        // Recalculate totals for current type
        this.resetForCurrentType();
    }

    // Convenience getters for components
    get current() { return this.state.value; }
    get isRunning() { return this.state.value.isRunning; }
    get timerType() { return this.state.value.timerType; }
    get currentTime() { return this.state.value.currentTime; }
    get totalSeconds() { return this.state.value.totalSeconds; }
    get completedCycles() { return this.state.value.completedCycles; }

    // Local settings
    loadAppSettings() {
        try {
            const s = localStorage.getItem('appSettings');
            if (s) {
                const parsed = JSON.parse(s);
                if (typeof parsed.modoAutomatico === 'boolean') this.autoMode = parsed.modoAutomatico;
            }
        } catch { /* ignore */ }
    }

    private setState(patch: Partial<TimerState>) {
        this.state.next({ ...this.state.value, ...patch });
    }

    private mapTipoToBackend(t: 'pomodoro' | 'shortBreak' | 'longBreak'): 'foco' | 'pausa_curta' | 'pausa_longa' {
        if (t === 'pomodoro') return 'foco';
        if (t === 'shortBreak') return 'pausa_curta';
        return 'pausa_longa';
    }
}