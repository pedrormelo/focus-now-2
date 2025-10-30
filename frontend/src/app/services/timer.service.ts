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
    private achievements: Record<string, { seen?: boolean; achieved_at?: string }> = {};
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
    private userSub: any;

    constructor() {
        // Load server state for current user
        this.bootstrapFromServer();
        // React to user changes to load fresh server state
        this.userSub = this.auth.currentUser$.subscribe(() => {
            this.bootstrapFromServer();
        });
    }

    private async bootstrapFromServer() {
        this.discoveredSounds = new Set<string>();
        this.playlist = [];
        this.achievements = {};
        await Promise.all([
            this.fetchTimerConfig().catch(() => {}),
            this.fetchUnlocks().catch(() => {}),
            this.fetchPlaylist().catch(() => {}),
            this.fetchAchievements().catch(() => {})
        ]);
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
                // Process newly unlocked sounds from server
                const newly = Array.isArray(resp?.newlyUnlocked) ? resp.newlyUnlocked as string[] : [];
                if (newly.length) {
                    let count = 0;
                    for (const id of newly) {
                        if (!this.discoveredSounds.has(id)) {
                            this.discoveredSounds.add(id);
                            count++;
                            this.onMusicUnlocked();
                        }
                    }
                }
                // Check streak-based achievements (4, 7, 14)
                this.checkAndCelebrateStreakMilestones();
                // Optionally refresh unlock list from server in background
                this.fetchUnlocks();
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

    async updateTimerConfig(config: any) {
        this.timerConfig = { ...this.timerConfig, ...config };
        // Persist to server
        try {
            await this.http.put(`${this.apiUrl}/me/timer-config`, {
                pomodoro: this.timerConfig.pomodoro,
                shortBreak: this.timerConfig.shortBreak,
                longBreak: this.timerConfig.longBreak,
                longBreakInterval: this.timerConfig.longBreakInterval
            }, { headers: this.getAuthHeaders() }).toPromise();
        } catch { /* ignore transient */ }
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

    // Server-backed: unlocks
    private async fetchUnlocks() {
        try {
            const list = await this.http.get<string[]>(`${this.apiUrl}/me/unlocks`, { headers: this.getAuthHeaders() }).toPromise();
            (list || []).forEach(id => this.discoveredSounds.add(id));
        } catch { /* ignore */ }
    }
    getDiscoveredSounds(): string[] { return Array.from(this.discoveredSounds); }
    getDiscoveredSoundsCount(): number { return this.discoveredSounds.size; }
    // Only count sounds that are part of our unlockable catalog
    getDiscoveredCatalogCount(): number {
        const keys = Object.keys(this.unlockRules);
        let count = 0;
        for (const k of keys) if (this.discoveredSounds.has(k)) count++;
        return count;
    }
    getSoundCatalogTotal(): number { return Object.keys(this.unlockRules).length; }

    // Focus playlist management (server-backed)
    private async fetchPlaylist() {
        try {
            const arr = await this.http.get<string[]>(`${this.apiUrl}/me/playlist`, { headers: this.getAuthHeaders() }).toPromise();
            this.playlist = Array.isArray(arr) ? arr.filter(s => typeof s === 'string') : [];
        } catch { this.playlist = []; }
    }
    private async persistPlaylist() {
        try { await this.http.put(`${this.apiUrl}/me/playlist`, this.playlist, { headers: this.getAuthHeaders() }).toPromise(); } catch { /* ignore */ }
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
    private async onMusicUnlocked() {
        try {
            this.celebrate.celebrateMusicUnlocked();
            // Also check music exploration achievements (1 and 4), server-backed
            const count = this.getDiscoveredSoundsCount();
            if (count >= 1 && !this.achievements['music_1']) {
                this.celebrate.celebrateAchievement();
                await this.achieve('music_1');
            }
            if (count >= 4 && !this.achievements['music_4']) {
                this.celebrate.celebrateAchievement();
                await this.achieve('music_4');
            }
        } catch { /* ignore */ }
    }

    private checkAndCelebrateStreakMilestones() {
        this.getStreak().subscribe({
            next: async (res: any) => {
                const cur = res?.currentStreak || 0;
                const thresholds = [4, 7, 14];
                for (const t of thresholds) {
                    const key = `streak_${t}`;
                    if (cur >= t && !this.achievements[key]) {
                        this.celebrate.celebrateAchievement();
                        await this.achieve(key);
                    }
                }
            },
            error: () => { /* ignore */ }
        });
    }

    // Achievements (server-backed)
    private async fetchAchievements() {
        try {
            const map = await this.http.get<Record<string, { seen: boolean; achieved_at: string }>>(`${this.apiUrl}/me/achievements`, { headers: this.getAuthHeaders() }).toPromise();
            this.achievements = map || {};
        } catch { this.achievements = {}; }
    }
    private async achieve(key: string) {
        try {
            await this.http.post(`${this.apiUrl}/me/achievements/achieve`, { key }, { headers: this.getAuthHeaders() }).toPromise();
            this.achievements[key] = { seen: false };
        } catch { /* ignore */ }
    }

    // --- Unlocking logic ---
    private checkAndUnlockSounds(currentLevel: number, totalCompletedCycles: number) {
        // Unlock logic now runs on the server during ciclo completion. This method is retained for compatibility.
        // No client-side unlocking here.
    }

    private async fetchTimerConfig() {
        try {
            const cfg: any = await this.http.get(`${this.apiUrl}/me/timer-config`, { headers: this.getAuthHeaders() }).toPromise();
            if (cfg) this.timerConfig = {
                pomodoro: Number(cfg.pomodoro) || this.timerConfig.pomodoro,
                shortBreak: Number(cfg.shortBreak) || this.timerConfig.shortBreak,
                longBreak: Number(cfg.longBreak) || this.timerConfig.longBreak,
                longBreakInterval: Number(cfg.longBreakInterval) || this.timerConfig.longBreakInterval,
                alarmSound: this.timerConfig.alarmSound
            };
            // Reset totals respecting current type
            this.resetForCurrentType();
        } catch { /* ignore */ }
    }
}