import { Injectable } from '@angular/core';

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable({ providedIn: 'root' })
export class AudioService {
  private bgAudio: HTMLAudioElement | null = null;
  private previewAudio: HTMLAudioElement | null = null;
  private muted = false;
  private volume = 1.0; // 0..1

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
    const id = ids[0]; // simple: play first track looped
    await this.playBackgroundById(id, true);
  }

  async playBackgroundById(id: string, loop = true) {
    try { this.stop(); } catch {}
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
  }

  stop() {
    if (this.bgAudio) {
      try { this.bgAudio.pause(); } catch {}
      try { this.bgAudio.src = ''; } catch {}
      this.bgAudio = null;
    }
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
    await audio.play().catch(() => {/* ignore */});
    this.previewAudio = audio;
  }

  async stopPreview() {
    if (this.previewAudio) {
      try { this.previewAudio.pause(); } catch {}
      try { this.previewAudio.src = ''; } catch {}
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
}
