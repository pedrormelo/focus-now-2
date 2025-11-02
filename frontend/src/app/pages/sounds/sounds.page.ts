import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { TimerService } from '../../services/timer.service';
import { AudioService } from '../../services/audio.service';
import { AuthService } from '../../services/auth.service';
import { MUSIC_CATALOG, Track } from '../../data/music-catalog';

type SoundItem = Track;

@Component({
    selector: 'app-sounds',
    templateUrl: './sounds.page.html',
    styleUrls: ['./sounds.page.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, LogoComponent, BottomNavComponent]
})
export class SoundsPage implements OnInit, OnDestroy {
    playlist: SoundItem[] = [];
    available: SoundItem[] = [];
    unavailable: SoundItem[] = [];
    catalog: SoundItem[] = MUSIC_CATALOG;

    private timerService = inject(TimerService);
    private auth = inject(AuthService);
    private audio = inject(AudioService);
    private router = inject(Router);
    private toast = inject(ToastController);
        private currentPreviewId: string | null = null;
        private previewTimeout: any = null;
        private userSub?: any;

    ngOnInit(): void {
        this.refreshAll();
        // Recalculate availability live when XP/level changes
        this.userSub = this.auth.currentUser$.subscribe(() => this.refreshAll());
    }

    ngOnDestroy(): void {
        if (this.userSub) this.userSub.unsubscribe?.();
    }

    refreshAll() {
        const discoveredNames = new Set(this.timerService.getDiscoveredSounds().filter(s => s && s !== 'Alarme Padrão'));
        // Map playlist ids to catalog items when possible
        const plist = this.timerService.getPlaylist();
        this.playlist = plist.map((id) => {
            const found = this.catalog.find(c => c.id === id);
            return found ? found : { id, title: id, artist: 'Playlist' };
        });

        this.available = this.catalog.filter(c => discoveredNames.has(c.id));
        this.unavailable = this.catalog.filter(c => !discoveredNames.has(c.id));
    }

    coverFor(id: string): string {
        const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `assets/sounds/covers/${slug}.jpg`;
    }

    onCoverError(ev: Event) {
        const el = ev?.target as HTMLImageElement | null;
        if (el) el.style.display = 'none';
    }

        async play(item: SoundItem) {
            // Toggle preview of the selected item using AudioService
            if (this.currentPreviewId === item.id || this.audio.isPreviewing(item.id)) {
                await this.stopPreview(item);
                return;
            }
            // Start new preview
            this.currentPreviewId = item.id;
            if (this.previewTimeout) { clearTimeout(this.previewTimeout); this.previewTimeout = null; }
            try { await this.audio.playPreview(item.id); } catch { /* ignore */ }
            const t = await this.toast.create({ message: `Reproduzindo prévia: ${item.title}`, duration: 1000, color: 'dark', position: 'bottom' });
            await t.present();
            // Auto-stop preview after a few seconds
            this.previewTimeout = setTimeout(async () => {
                await this.audio.stopPreview();
                this.currentPreviewId = null;
                this.previewTimeout = null;
            }, 5000);
        }

        private async stopPreview(item: SoundItem) {
            if (this.previewTimeout) { clearTimeout(this.previewTimeout); this.previewTimeout = null; }
            try { await this.audio.stopPreview(); } catch { /* ignore */ }
            this.currentPreviewId = null;
            const t = await this.toast.create({ message: `Prévia pausada: ${item.title}`, duration: 800, color: 'medium', position: 'bottom' });
            await t.present();
        }

    async add(item: SoundItem) {
        // Ensure unlocked then add to playlist
        this.timerService.addToPlaylist(item.id);
        this.refreshAll();
        const t = await this.toast.create({ message: `Adicionado à playlist: ${item.title}`, duration: 1200, color: 'success', position: 'bottom' });
        await t.present();
    }

    async remove(item: SoundItem) {
        this.timerService.removeFromPlaylist(item.id);
        this.refreshAll();
        const t = await this.toast.create({ message: `Removido da playlist: ${item.title}`, duration: 1200, color: 'medium', position: 'bottom' });
        await t.present();
    }

    inPlaylist(id: string): boolean { return this.timerService.isInPlaylist(id); }
    isPlaying(item: SoundItem): boolean { return this.currentPreviewId === item.id || this.audio.isPreviewing(item.id); }

    scrollToAvailable() {
        const el = document.getElementById('available-section')
        if (el) {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            catch { el.scrollIntoView(); }
        }
    }

    back() { this.router.navigate(['/progress']); }
}
