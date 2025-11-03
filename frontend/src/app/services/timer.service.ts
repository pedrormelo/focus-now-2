import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { CelebrationService } from './celebration.service';
import { AudioService } from './audio.service';
import { getUnlockRulesMap, getCatalogIds } from '../data/music-catalog';
import { environment } from '../../environments/environment';
import { SettingsService } from './settings.service';

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
    private apiUrl = `${environment.apiBaseUrl}/api`;

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
    private preEndWarningSeconds = 5; // seconds before end to beep
    private preEndTriggered = false;
    private alarmVolume = 1.0; // 0..1
    private alarmSound: 'bell' | 'digital' | 'security' | 'beep' = 'bell';
    private alarmAudio: HTMLAudioElement | null = null;
    private activeBeeps: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
    private previewStopTimer: any = null;
    private vibrateOnEnd = true;
    private audioCtx: AudioContext | null = null;
    // Unlock rules for focus sounds: by level and/or total completed cycles
    private unlockRules: Record<string, { minLevel?: number; minCycles?: number }> = getUnlockRulesMap();
    // Event stream notifying UI when a session completes
    completed$ = new Subject<'pomodoro' | 'shortBreak' | 'longBreak'>();

    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private celebrate = inject(CelebrationService);
    private audio = inject(AudioService);
    private settings = inject(SettingsService);
    private userSub: any;

    constructor() {
        // React to settings changes centrally
    const snap = this.settings.getSnapshot();
    this.applySettingsSnapshot(snap);
    // IMPORTANT: subscribe to live settings without merging with the initial snapshot,
    // otherwise omitted fields revert to initial defaults (e.g., modoAutomatico flips back to true)
    this.settings.settings$.subscribe((s) => this.applySettingsSnapshot(s));
        // Load server state for current user
        this.bootstrapFromServer();
        // React to user changes to load fresh server state
        this.userSub = this.auth.currentUser$.subscribe(() => {
            this.bootstrapFromServer();
        });
    }

    private async bootstrapFromServer() {
        // Skip server bootstrap if not authenticated (prevents 403s when token is missing)
        try { if (!this.auth.isAuthenticated()) return; } catch {}
        this.discoveredSounds = new Set<string>();
        this.playlist = [];
        this.achievements = {};
        // One-time migration of any legacy localStorage data
        await this.migrateFromLocalOnce().catch(() => {});
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
        // Only attach Authorization when not using cookie-based auth
        if (!environment.useCookies && token) {
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
        this.preEndTriggered = false;
        if (this.tickSub) this.tickSub.unsubscribe();
        this.tickSub = interval(1000).subscribe(() => {
            const cur = this.state.value;
            if (!cur.isRunning) return;
            // Pre-end warning
            if (!this.preEndTriggered && cur.currentTime === this.preEndWarningSeconds && this.timerType === 'pomodoro') {
                try { this.playBeepPattern(Math.max(0.2, Math.min(1, this.getAlarmVolume?.() || 1))); } catch { /* ignore */ }
                this.preEndTriggered = true;
            }
            if (cur.currentTime > 0) {
                this.setState({ currentTime: cur.currentTime - 1 });
            } else {
                this.onComplete();
            }
        });
        // Autoplay/Resume playlist when focus starts (or resume from pause); stop on breaks
        const settings = this.getAppSettings();
        if (this.timerType === 'pomodoro') {
            // Always resume if we had paused music earlier
            try {
                const snap = this.settings.getSnapshot();
                this.audio.setPlaybackMode(snap.playbackMode || 'sequence');
            } catch {}
            this.audio.setMuted(this.muted);
            this.audio.setVolume(this.getAlarmVolume?.() ?? 1);
            if (this.audio.isBackgroundPaused()) {
                this.audio.resumeBackground();
            } else if (settings.autoplayOnFocus && !this.audio.isBackgroundPlaying()) {
                const list = this.getPlaylist();
                if (list && list.length) {
                    this.audio.playPlaylist(list);
                } else {
                    // Fallback: play discovered/unlocked sounds if user has none in playlist
                    const fallback = Array.from(this.discoveredSounds);
                    if (fallback.length) this.audio.playPlaylist(fallback);
                }
            }
        } else if ((this.timerType === 'shortBreak' || this.timerType === 'longBreak') && settings.pauseOnBreaks) {
            this.audio.stop();
        }
    }

    pause() {
        const s = this.state.value;
        if (!s.isRunning) return;
        this.setState({ isRunning: false });
        // Optionally pause background music while pausing focus
        try {
            const snap = this.settings.getSnapshot();
            if (s.timerType === 'pomodoro' && snap.pauseMusicOnTimerPause) {
                this.audio.pauseBackground();
            }
        } catch { /* ignore */ }
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
        this.preEndTriggered = false;
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
        let completionEmitted = false;
        const emitCompletionOnce = () => {
            if (completionEmitted) return; completionEmitted = true;
            try { this.completed$.next(cur.timerType); } catch {}
        };
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
                            // Check streak-based achievements (4, 7, 14)
                            // Optionally refresh unlock list from server in background
                            this.fetchUnlocks();
                            this.checkAndCelebrateStreakMilestones()
                                .then(() => emitCompletionOnce())
                                .catch(() => emitCompletionOnce());
            },
            error: () => { /* ignore for now */ emitCompletionOnce(); }
        });

        // Increment dots after every session
        let completedCycles = cur.completedCycles + 1;
        let cyclesSinceLongBreak = cur.cyclesSinceLongBreak;
        if (cur.timerType === 'pomodoro') cyclesSinceLongBreak += 1;
        this.setState({ completedCycles, cyclesSinceLongBreak });

    // Alarm sound and haptics
    this.playAlarmAndHaptics();

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
        // If moving into a break, optionally stop background audio immediately
        try {
            const s = this.getAppSettings();
            if ((next === 'shortBreak' || next === 'longBreak') && s.pauseOnBreaks) {
                this.audio.stop();
            }
        } catch { /* ignore */ }
        this.setState({ cyclesSinceLongBreak });
        // Decide whether to auto-start the next phase
        if (!this.autoMode) {
            // Stop ticking; user must start manually (via modal button or timer Start)
            this.setState({ isRunning: false });
            this.setType(next);
        } else {
            // Auto mode: switch and keep running seamlessly
            this.setType(next);
            this.start();
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

    // Apply settings snapshot to internal state
    private applySettingsSnapshot(s: { modoAutomatico?: boolean; mutar?: boolean; vibrateOnEnd?: boolean; alarmVolume?: number; preEndWarningSeconds?: number; alarmSound?: 'bell' | 'digital' | 'security' | 'beep' }) {
        if (typeof s.modoAutomatico === 'boolean') this.autoMode = s.modoAutomatico;
        if (typeof s.mutar === 'boolean') {
            this.muted = s.mutar;
            try { this.audio.setMuted(this.muted); } catch {}
        }
        if (typeof s.vibrateOnEnd === 'boolean') this.vibrateOnEnd = s.vibrateOnEnd;
        if (typeof s.alarmVolume === 'number') {
            this.alarmVolume = Math.max(0, Math.min(1, s.alarmVolume));
            try { this.audio.setVolume(this.alarmVolume); } catch {}
        }
        if (typeof s.preEndWarningSeconds === 'number') this.preEndWarningSeconds = Math.max(0, Math.min(60, Math.floor(s.preEndWarningSeconds)));
        if (s.alarmSound) this.alarmSound = s.alarmSound;
    }

    // Read appSettings convenience (includes feature flags we may add gradually)
    private getAppSettings(): { autoplayOnFocus: boolean; pauseOnBreaks: boolean } {
        try {
            const s = localStorage.getItem('appSettings');
            const parsed = s ? JSON.parse(s) : {};
            return {
                autoplayOnFocus: !!parsed.autoplayOnFocus,
                pauseOnBreaks: parsed.pauseOnBreaks !== false // default true
            };
        } catch {
            return { autoplayOnFocus: false, pauseOnBreaks: true };
        }
    }

    // Mute handling for focus music previews/alarms
    setMuted(m: boolean) {
        this.settings.setPartial({ mutar: !!m });
    }
    get isMuted() { return this.muted; }

    setAlarmVolume(v: number) {
        const vol = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : this.alarmVolume;
        this.settings.setPartial({ alarmVolume: vol });
    }
    getAlarmVolume() { return this.alarmVolume; }
    setVibrateOnEnd(b: boolean) {
        this.settings.setPartial({ vibrateOnEnd: !!b });
    }
    getVibrateOnEnd() { return this.vibrateOnEnd; }

    setPreEndWarningSeconds(sec: number) {
        const val = Number.isFinite(sec) ? Math.max(0, Math.min(60, Math.floor(sec))) : this.preEndWarningSeconds;
        this.settings.setPartial({ preEndWarningSeconds: val });
    }
    getPreEndWarningSeconds() { return this.preEndWarningSeconds; }

    private setState(patch: Partial<TimerState>) {
        this.state.next({ ...this.state.value, ...patch });
    }

    private mapTipoToBackend(t: 'pomodoro' | 'shortBreak' | 'longBreak'): 'foco' | 'pausa_curta' | 'pausa_longa' {
        if (t === 'pomodoro') return 'foco';
        if (t === 'shortBreak') return 'pausa_curta';
        return 'pausa_longa';
    }

    // --- Alarm & haptics helpers ---
    private playAlarmAndHaptics() {
        try {
            // Ensure only one alarm sound at a time (stop any preview or previous alarm)
            this.stopAnyAlarm();
            if (!this.muted && this.alarmVolume > 0) {
                if (this.alarmSound === 'beep') {
                    // Extend beep duration for actual completion alarm
                    this.playBeepPattern(this.alarmVolume, 10);
                } else {
                    // Loop asset briefly to increase perceived duration
                    this.playAlarmAsset(this.alarmSound, this.alarmVolume, 12);
                }
            }
        } catch { /* ignore */ }
        try {
            const nav: any = navigator as any;
            if (this.vibrateOnEnd && typeof nav?.vibrate === 'function') {
                nav.vibrate([200, 100, 200]);
            }
        } catch { /* ignore */ }
    }

    private playAlarmAsset(kind: 'bell' | 'digital' | 'security', volume: number, maxDurationSec?: number) {
        // Stop any current alarm (asset or beep) before starting a new one
        this.stopAnyAlarm();
        const filename = kind === 'bell'
            ? 'door-bell-430377.mp3'
            : (kind === 'digital' ? 'mixkit-digital-clock-digital-alarm-buzzer-992.wav' : 'mixkit-security-facility-breach-alarm-994.wav');
        const src = `assets/sounds/alarms/${filename}`;
        // Reuse a single audio element to avoid any overlap at the platform level
        let el = this.alarmAudio;
        if (!el) el = new Audio();
        try { el.pause(); } catch {}
        try { el.currentTime = 0; } catch {}
        el.loop = false;
        el.muted = this.muted;
        el.volume = Math.max(0, Math.min(1, volume || 0));
        el.onended = null;
        el.onerror = null;
        el.src = src;
        const clearStop = () => { if (this.previewStopTimer) { clearTimeout(this.previewStopTimer); this.previewStopTimer = null; } };
        el.onended = () => { clearStop(); try { el!.src = ''; } catch {}; this.alarmAudio = null; };
        el.onerror = () => { clearStop(); this.alarmAudio = null; };
        el.play().catch(() => { /* ignore */ });
        // Optional preview limiter
        if (typeof maxDurationSec === 'number' && maxDurationSec > 0) {
            this.previewStopTimer = setTimeout(() => {
                try { el!.pause(); } catch {}
                try { (el as HTMLAudioElement).src = ''; } catch {}
                this.alarmAudio = null;
                this.previewStopTimer = null;
            }, Math.floor(maxDurationSec * 1000));
        }
        this.alarmAudio = el;
    }

    // Public helper to preview the current alarm from settings UI
    testAlarm() {
        try {
            // Ensure preview doesn't overlap with any current alarm or beep
            this.stopAnyAlarm();
            if (this.alarmSound === 'beep') {
                // Beep preview is short by nature; still ensure exclusivity
                this.playBeepPattern(this.alarmVolume);
            } else {
                // Limit preview to a maximum of 5 seconds
                this.playAlarmAsset(this.alarmSound, this.alarmVolume, 5);
            }
        } catch { /* ignore */ }
    }

    private ensureAudioContext() {
        if (!this.audioCtx) {
            const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (Ctx) this.audioCtx = new Ctx();
        }
        return this.audioCtx;
    }

    private beepInterval: any = null;
    private playBeepPattern(volume: number, totalSeconds: number = 1) {
        const ctx = this.ensureAudioContext();
        if (!ctx) return;
        // Stop any active beeps before starting a new pattern
        this.stopActiveBeeps();
        const scheduleBurst = () => {
            const now = ctx.currentTime;
            const pulses = [ { start: now, dur: 0.2, freq: 800 }, { start: now + 0.4, dur: 0.2, freq: 800 } ];
            for (const p of pulses) {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = p.freq;
                const gain = ctx.createGain();
                gain.gain.value = 0;
                osc.connect(gain).connect(ctx.destination);
                gain.gain.setValueAtTime(0, p.start);
                gain.gain.linearRampToValueAtTime(volume, p.start + 0.02);
                gain.gain.setTargetAtTime(0, p.start + p.dur - 0.05, 0.02);
                osc.start(p.start);
                osc.stop(p.start + p.dur + 0.1);
                this.activeBeeps.push({ osc, gain });
            }
        };
        scheduleBurst();
        if (totalSeconds > 1) {
            const periodMs = 800; // repeat bursts roughly every 0.8s
            const endAt = Date.now() + Math.floor(totalSeconds * 1000);
            this.beepInterval = setInterval(() => {
                if (Date.now() >= endAt) {
                    try { clearInterval(this.beepInterval); } catch {}
                    this.beepInterval = null;
                } else {
                    scheduleBurst();
                }
            }, periodMs);
        }
    }

    private stopActiveBeeps() {
        try {
            for (const n of this.activeBeeps) {
                try { n.osc.stop(); } catch { }
                try { n.osc.disconnect(); } catch { }
                try { n.gain.disconnect(); } catch { }
            }
        } catch { /* ignore */ }
        this.activeBeeps = [];
        if (this.beepInterval) { try { clearInterval(this.beepInterval); } catch {} this.beepInterval = null; }
    }

    private stopAnyAlarm() {
        // Stop asset-based alarm
        try {
            if (this.alarmAudio) {
                try { this.alarmAudio.pause(); } catch {}
                try { this.alarmAudio.currentTime = 0; } catch {}
                try { this.alarmAudio.onended = null; } catch {}
                try { this.alarmAudio.onerror = null; } catch {}
                try { this.alarmAudio.src = ''; } catch {}
            }
        } catch { /* ignore */ }
        this.alarmAudio = null;
        // Cancel any pending preview stop timer
        if (this.previewStopTimer) {
            try { clearTimeout(this.previewStopTimer); } catch {}
            this.previewStopTimer = null;
        }
        // Stop WebAudio beep oscillators
        this.stopActiveBeeps();
    }

    // Server-backed: unlocks
    private async fetchUnlocks() {
        try {
            const list = await this.http.get<string[]>(`${this.apiUrl}/me/unlocks`, { headers: this.getAuthHeaders() }).toPromise();
            (list || []).forEach(id => this.discoveredSounds.add(id));
        } catch { /* ignore */ }
    }
    // Public helpers to refresh unlocks and trigger dev unlock-all
    async reloadUnlocks() { this.discoveredSounds = new Set<string>(); await this.fetchUnlocks(); }
    async devUnlockAll() {
        if ((environment as any).production) return;
        try {
            await this.http.post(`${this.apiUrl}/dev/unlock-all`, {}, { headers: this.getAuthHeaders() }).toPromise();
        } catch { /* ignore */ }
    }

    // Dev-only: reset all user data on the server and refresh local state
    async devResetUser() {
        if ((environment as any).production) return;
        try {
            await this.http.post(`${this.apiUrl}/dev/reset-user`, {}, { headers: this.getAuthHeaders() }).toPromise();
        } catch {
            throw new Error('reset-failed');
        }
        // Refresh client-side caches/state
        this.discoveredSounds = new Set<string>();
        this.playlist = [];
        this.achievements = {};
        await Promise.all([
            this.fetchTimerConfig().catch(() => {}),
            this.fetchUnlocks().catch(() => {}),
            this.fetchPlaylist().catch(() => {}),
            this.fetchAchievements().catch(() => {})
        ]);
        // Stop any playing audio and reset timer to defaults
        try { this.audio.stop(); } catch {}
        this.setType('pomodoro');
        this.setState({ isRunning: false, completedCycles: 0, cyclesSinceLongBreak: 0 });
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
    getSoundCatalogTotal(): number { return getCatalogIds().length; }

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

    private checkAndCelebrateStreakMilestones(): Promise<void> {
        return new Promise<void>((resolve) => {
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
                    resolve();
                },
                error: () => { resolve(); }
            });
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

    // --- One-time migration from legacy localStorage to server ---
    private async migrateFromLocalOnce() {
        const uid = this.auth.getCurrentUser()?.id;
        if (!uid) return; // only when logged
        const flagKey = `migration_v1:${uid}`;
        if (localStorage.getItem(flagKey)) return;

        // Legacy keys to check
        const dsKeys = [`discoveredSounds:${uid}`, 'discoveredSounds'];
        const plKeys = [`focusPlaylist:${uid}`, 'focusPlaylist'];
        const celKeys = [`celebrations:${uid}`, 'celebrations'];

        const readArray = (keys: string[]) => {
            for (const k of keys) {
                try {
                    const raw = localStorage.getItem(k);
                    if (!raw) continue;
                    const arr = JSON.parse(raw);
                    if (Array.isArray(arr)) return arr.filter((s: any) => typeof s === 'string');
                } catch { /* ignore */ }
            }
            return [] as string[];
        };
        const readObject = (keys: string[]) => {
            for (const k of keys) {
                try {
                    const raw = localStorage.getItem(k);
                    if (!raw) continue;
                    const obj = JSON.parse(raw);
                    if (obj && typeof obj === 'object') return obj as any;
                } catch { /* ignore */ }
            }
            return {} as any;
        };

        const legacySounds = readArray(dsKeys);
        const legacyPlaylist = readArray(plKeys);
        const legacyCelebrations = readObject(celKeys);

        // Upsert unlocks
        if (legacySounds.length) {
            try { await this.http.put(`${this.apiUrl}/me/unlocks`, legacySounds, { headers: this.getAuthHeaders() }).toPromise(); } catch {}
        }
        // Replace playlist
        if (legacyPlaylist.length) {
            try { await this.http.put(`${this.apiUrl}/me/playlist`, legacyPlaylist, { headers: this.getAuthHeaders() }).toPromise(); } catch {}
        }
        // Achievements: mark achieved (and seen if present)
        const achKeys = ['music_1', 'music_4', 'streak_4', 'streak_7', 'streak_14'];
        for (const key of achKeys) {
            const val = legacyCelebrations?.[key];
            if (val) {
                try {
                    await this.http.post(`${this.apiUrl}/me/achievements/achieve`, { key }, { headers: this.getAuthHeaders() }).toPromise();
                    if (val === true) {
                        // If we stored boolean true meaning achieved (no separate seen), skip marking seen
                    } else if (val?.seen === true) {
                        await this.http.post(`${this.apiUrl}/me/achievements/seen`, { key }, { headers: this.getAuthHeaders() }).toPromise();
                    }
                } catch { /* ignore */ }
            }
        }

        try { localStorage.setItem(flagKey, 'true'); } catch { /* ignore */ }
    }
}