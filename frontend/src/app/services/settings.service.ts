import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  temaEscuro?: boolean;
  modoAutomatico?: boolean;
  mutar?: boolean;
  vibrateOnEnd?: boolean;
  alarmVolume?: number; // 0..1
  alarmSound?: 'bell' | 'digital' | 'security' | 'beep';
  autoplayOnFocus?: boolean;
  pauseOnBreaks?: boolean;
  preEndWarningSeconds?: number; // 0..60
  playbackMode?: 'sequence' | 'shuffle' | 'repeat-one';
  pauseMusicOnTimerPause?: boolean;
  showCompletionModal?: boolean;
}

const STORAGE_KEY = 'appSettings';

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function clampInt(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.floor(n))); }

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly defaults: Required<AppSettings> = {
    temaEscuro: true,
    modoAutomatico: true,
    mutar: false,
    vibrateOnEnd: true,
    alarmVolume: 1,
    alarmSound: 'bell',
    autoplayOnFocus: false,
    pauseOnBreaks: true,
    preEndWarningSeconds: 5,
    playbackMode: 'sequence',
    pauseMusicOnTimerPause: true,
    showCompletionModal: true,
  };

  private subject = new BehaviorSubject<AppSettings>(this.loadFromStorage());
  settings$ = this.subject.asObservable();

  getSnapshot(): Required<AppSettings> {
    return { ...this.defaults, ...this.subject.value } as Required<AppSettings>;
  }

  setPartial(patch: Partial<AppSettings>) {
    const next = this.normalize({ ...this.getSnapshot(), ...patch });
    this.subject.next(next);
    this.persist(next);
  }

  private loadFromStorage(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return this.normalize({ ...this.defaults, ...parsed });
    } catch {
      return { ...this.defaults };
    }
  }

  private persist(val: AppSettings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)); } catch { /* ignore */ }
  }

  private normalize(s: AppSettings): Required<AppSettings> {
    return {
      temaEscuro: !!s.temaEscuro,
      modoAutomatico: s.modoAutomatico !== false,
      mutar: !!s.mutar,
      vibrateOnEnd: s.vibrateOnEnd !== false,
      alarmVolume: clamp01(typeof s.alarmVolume === 'number' ? s.alarmVolume : this.defaults.alarmVolume),
      alarmSound: (s.alarmSound === 'digital' || s.alarmSound === 'security' || s.alarmSound === 'beep') ? s.alarmSound : 'bell',
      autoplayOnFocus: !!s.autoplayOnFocus,
      pauseOnBreaks: s.pauseOnBreaks !== false,
      preEndWarningSeconds: clampInt(typeof s.preEndWarningSeconds === 'number' ? s.preEndWarningSeconds : this.defaults.preEndWarningSeconds, 0, 60),
      playbackMode: (s.playbackMode === 'shuffle' || s.playbackMode === 'repeat-one') ? s.playbackMode : 'sequence',
      pauseMusicOnTimerPause: s.pauseMusicOnTimerPause !== false,
      showCompletionModal: s.showCompletionModal !== false,
    };
  }
}
