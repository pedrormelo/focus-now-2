import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { CelebrationService } from './celebration.service';

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
    private discoveredSounds = new Set<string>();
    private playlist: string[] = [];
    private muted = false;
    // Unlock rules for focus sounds: by level and/or total completed cycles
    private unlockRules: Record<string, { minLevel?: number; minCycles?: number }> = {
        'Sons da Floresta': { minLevel: 1 },
        'Sons de Chuva': { minCycles: 2 },
        'Quiet Resource - Evelyn': { minLevel: 2 },
        'Saudade - Gabriel Albuquerque': { minLevel: 3 },
        'Mix de Frases #1': { minCycles: 4 },
        'Mix de Frases #2': { minLevel: 4 }
    };

    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private celebrate = inject(CelebrationService);

    constructor() {
        this.loadDiscoveredSounds();
        this.loadPlaylist();
    }

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
        const before = this.auth.getCurrentUser();
        const prevNivel = before?.nivel || 1;
        this.saveCiclo({ tipo: tipoBackend, duracao: minutos, completado: true }).subscribe({
            next: (resp: any) => {
                // Update user xp/nivel in real time if provided by backend
                if (resp && (typeof resp.xp === 'number' || typeof resp.nivel === 'number')) {
                    this.auth.updateCurrentUser({ xp: resp.xp, nivel: resp.nivel });
                }
                // Level up celebration
                if ((resp?.levelUp === true) || ((resp?.nivel || prevNivel) > prevNivel)) {
                    this.celebrate.celebrateLevelUp();
                }
                // Check streak-based achievements (4, 7, 14)
                this.checkAndCelebrateStreakMilestones();
                // Re-evaluate sound unlocks using latest stats (cycles completed)
                this.getEstatisticas().subscribe({
                    next: (stats: any) => {
                        const cycles = stats?.ciclos_completados ?? 0;
                        const lvl = this.auth.getCurrentUser()?.nivel || prevNivel;
                        this.checkAndUnlockSounds(lvl, cycles);
                    },
                    error: () => { /* ignore */ }
                });
            },
            error: () => { /* ignore for now */ }
        });

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

    getDiasFoco(start?: string, end?: string, tzOffset?: number) {
        const params: string[] = [];
        if (start) params.push(`start=${encodeURIComponent(start)}`);
        if (end) params.push(`end=${encodeURIComponent(end)}`);
        if (typeof tzOffset === 'number' && Number.isFinite(tzOffset)) params.push(`tzOffset=${tzOffset}`);
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
        // No longer auto-discover sounds via alarm selection; unlocking is gated by level/cycles now.
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
                if (typeof parsed.mutar === 'boolean') this.muted = parsed.mutar;
            }
        } catch { /* ignore */ }
    }

    // Mute handling for focus music previews/alarms
    setMuted(m: boolean) {
        this.muted = !!m;
        // Persist into the shared appSettings blob
        try {
            const s = localStorage.getItem('appSettings');
            const parsed = s ? JSON.parse(s) : {};
            parsed.mutar = this.muted;
            localStorage.setItem('appSettings', JSON.stringify(parsed));
        } catch { /* ignore */ }
    }
    get isMuted() { return this.muted; }

    private setState(patch: Partial<TimerState>) {
        this.state.next({ ...this.state.value, ...patch });
    }

    private mapTipoToBackend(t: 'pomodoro' | 'shortBreak' | 'longBreak'): 'foco' | 'pausa_curta' | 'pausa_longa' {
        if (t === 'pomodoro') return 'foco';
        if (t === 'shortBreak') return 'pausa_curta';
        return 'pausa_longa';
    }

    // Sounds discovery tracking
    private loadDiscoveredSounds() {
        try {
            const raw = localStorage.getItem('discoveredSounds');
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) arr.forEach((s) => { if (typeof s === 'string') this.discoveredSounds.add(s); });
            }
        } catch { /* ignore */ }
    }
    private persistDiscoveredSounds() {
        try { localStorage.setItem('discoveredSounds', JSON.stringify(Array.from(this.discoveredSounds))); } catch { /* ignore */ }
    }
    getDiscoveredSounds(): string[] { return Array.from(this.discoveredSounds); }
    getDiscoveredSoundsCount(): number { return this.discoveredSounds.size; }

    // Focus playlist management
    private loadPlaylist() {
        try {
            const raw = localStorage.getItem('focusPlaylist');
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) this.playlist = arr.filter((s) => typeof s === 'string');
            }
        } catch { /* ignore */ }
    }
    private persistPlaylist() {
        try { localStorage.setItem('focusPlaylist', JSON.stringify(this.playlist)); } catch { /* ignore */ }
    }
    getPlaylist(): string[] { return [...this.playlist]; }
    isInPlaylist(name: string): boolean { return this.playlist.includes(name); }
    addToPlaylist(name: string) {
        if (!name) return;
        // Only allow adding unlocked sounds
        if (!this.discoveredSounds.has(name)) return;
        if (!this.playlist.includes(name)) {
            this.playlist.push(name);
            this.persistPlaylist();
        }
    }
    removeFromPlaylist(name: string) {
        const idx = this.playlist.indexOf(name);
        if (idx >= 0) {
            this.playlist.splice(idx, 1);
            this.persistPlaylist();
        }
    }

    // --- Celebrations & milestones ---
    private onMusicUnlocked() {
        try {
            // Guard duplicate per-sound is naturally handled by the Set; trigger a modal for each new discovery
            this.celebrate.celebrateMusicUnlocked();
            // Also check music exploration achievements (1 and 4)
            const count = this.getDiscoveredSoundsCount();
            const marks = this.loadCelebrationMarks();
            if (count >= 1 && !marks.music_1) {
                this.celebrate.celebrateAchievement();
                marks.music_1 = true;
                this.saveCelebrationMarks(marks);
            }
            if (count >= 4 && !marks.music_4) {
                this.celebrate.celebrateAchievement();
                marks.music_4 = true;
                this.saveCelebrationMarks(marks);
            }
        } catch { /* ignore */ }
    }

    private checkAndCelebrateStreakMilestones() {
        this.getStreak().subscribe({
            next: (res: any) => {
                const cur = res?.currentStreak || 0;
                const marks = this.loadCelebrationMarks();
                const thresholds = [4, 7, 14];
                for (const t of thresholds) {
                    const key = `streak_${t}` as const;
                    if (cur >= t && !marks[key]) {
                        this.celebrate.celebrateAchievement();
                        marks[key] = true;
                    }
                }
                this.saveCelebrationMarks(marks);
            },
            error: () => { /* ignore */ }
        });
    }

    private loadCelebrationMarks(): any {
        try {
            const raw = localStorage.getItem('celebrations');
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }
    private saveCelebrationMarks(m: any) {
        try { localStorage.setItem('celebrations', JSON.stringify(m || {})); } catch { /* ignore */ }
    }

    // --- Unlocking logic ---
    private checkAndUnlockSounds(currentLevel: number, totalCompletedCycles: number) {
        let unlockedAny = false;
        Object.keys(this.unlockRules).forEach((id) => {
            if (this.discoveredSounds.has(id)) return;
            const rule = this.unlockRules[id];
            const meetsLevel = typeof rule.minLevel === 'number' ? currentLevel >= (rule.minLevel as number) : true;
            const meetsCycles = typeof rule.minCycles === 'number' ? totalCompletedCycles >= (rule.minCycles as number) : true;
            if (meetsLevel && meetsCycles) {
                this.discoveredSounds.add(id);
                unlockedAny = true;
                // Celebrate each new unlocked sound
                this.onMusicUnlocked();
            }
        });
        if (unlockedAny) this.persistDiscoveredSounds();
    }
}