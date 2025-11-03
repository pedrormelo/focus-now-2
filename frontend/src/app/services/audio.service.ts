import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable({ providedIn: 'root' })
export class AudioService {
  private bgAudio: HTMLAudioElement | null = null;
  private previewAudio: HTMLAudioElement | null = null;
  private muted = false;
  private volume = 1.0; // 0..1
  private playlistIds: string[] = [];
  private playlistIndex = 0;
  private playbackMode: 'sequence' | 'shuffle' | 'repeat-one' = 'sequence';
  private currentTrackIdSubject = new BehaviorSubject<string | null>(null);
  currentTrack$ = this.currentTrackIdSubject.asObservable();

  setMuted(m: boolean) {
    this.muted = !!m;
    if (this.bgAudio) this.bgAudio.muted = this.muted;
    if (this.previewAudio) this.previewAudio.muted = this.muted;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v || 0));
    if (this.bgAudio) this.bgAudio.volume = this.volume;
    if (this.previewAudio) this.previewAudio.volume = this.volume;
  }

  async playPlaylist(ids: string[]) {
    if (!ids || !ids.length) { this.stop(); return; }
    this.playlistIds = ids.slice();
    this.playlistIndex = 0;
    const loopSingle = this.playlistIds.length === 1 && this.playbackMode === 'sequence';
    await this.playBackgroundById(this.playlistIds[0], loopSingle || this.playbackMode === 'repeat-one');
    if (!loopSingle && this.playbackMode !== 'repeat-one') this.attachEndedToAdvance();
  }

  async playBackgroundById(id: string, loop = true) {
    try { this.stop(); } catch { }
    const src = this.srcFor(id);
    const audio = new Audio(src);
    audio.loop = loop;
    audio.muted = this.muted;
    audio.volume = this.volume;
    // Fallback: if load error, ignore silently
    audio.addEventListener('error', () => {
      // Failed to load asset; leave bgAudio null
      this.bgAudio = null;
    });
    await audio.play().catch(() => {/* ignore */});
    this.bgAudio = audio;
    if (!loop && this.playbackMode !== 'repeat-one') this.attachEndedToAdvance();
    this.currentTrackIdSubject.next(id);
  }

  stop() {
    if (this.bgAudio) {
      try { this.bgAudio.pause(); } catch { }
      try { this.bgAudio.src = ''; } catch { }
      this.bgAudio = null;
    }
    this.playlistIds = [];
    this.playlistIndex = 0;
    this.currentTrackIdSubject.next(null);
  }

  async playPreview(id: string) {
    await this.stopPreview();
    const src = this.srcFor(id);
    const audio = new Audio(src);
    audio.loop = false;
    audio.muted = this.muted;
    audio.volume = this.volume;
    audio.addEventListener('ended', () => { this.stopPreview(); });
    audio.addEventListener('error', () => { this.stopPreview(); });
    await audio.play().catch(() => {/* ignore */ });
    this.previewAudio = audio;
  }

  async stopPreview() {
    if (this.previewAudio) {
      try { this.previewAudio.pause(); } catch { }
      try { this.previewAudio.src = ''; } catch { }
      this.previewAudio = null;
    }
  }

  isPreviewing(id: string): boolean {
    return !!this.previewAudio && this.previewAudio.src.includes(slugify(id));
  }

  private srcFor(id: string): string {
    const slug = slugify(id);
    return `assets/sounds/${slug}.mp3`;
  }

  private attachEndedToAdvance() {
    if (!this.bgAudio) return;
    this.bgAudio.onended = () => {
      if (!this.playlistIds.length) return;
      if (this.playbackMode === 'repeat-one') {
        // Shouldn't reach here because loop=true, but guard anyway
        const id = this.playlistIds[this.playlistIndex] || this.playlistIds[0];
        this.playBackgroundById(id, true).catch(() => {});
        return;
      }
      if (this.playbackMode === 'shuffle') {
        // pick a random different index
        const n = this.playlistIds.length;
        let next = this.playlistIndex;
        if (n > 1) {
          while (next === this.playlistIndex) next = Math.floor(Math.random() * n);
        }
        this.playlistIndex = next;
      } else {
        // sequence
        this.playlistIndex = (this.playlistIndex + 1) % this.playlistIds.length;
      }
      const nextId = this.playlistIds[this.playlistIndex];
      // chain next track
      this.playBackgroundById(nextId, this.playlistIds.length === 1).catch(() => {/* ignore */ });
    };
  }

  setPlaybackMode(mode: 'sequence' | 'shuffle' | 'repeat-one') {
    this.playbackMode = mode;
    // If repeating one while playing, force loop
    if (this.bgAudio) this.bgAudio.loop = (mode === 'repeat-one') || (this.playlistIds.length <= 1 && mode === 'sequence');
  }
  getPlaybackMode() { return this.playbackMode; }

  pauseBackground() {
    if (this.bgAudio) {
      try { this.bgAudio.pause(); } catch {}
    }
  }
  resumeBackground() {
    if (this.bgAudio) {
      try { this.bgAudio.play().catch(() => {}); } catch {}
    }
  }
  isBackgroundPlaying(): boolean { return !!this.bgAudio && !this.bgAudio.paused; }
  isBackgroundPaused(): boolean { return !!this.bgAudio && this.bgAudio.paused; }
  getCurrentTrackId(): string | null { return this.currentTrackIdSubject.value; }
}
