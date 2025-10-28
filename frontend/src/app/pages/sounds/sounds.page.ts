import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { TimerService } from '../../services/timer.service';
import { AuthService } from '../../services/auth.service';

interface SoundItem {
    title: string;
    artist: string;
    id: string; // unique identifier
}

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
    catalog: SoundItem[] = [
        { id: 'Sons da Floresta', title: 'Sons da Floresta', artist: 'Vários Artistas' },
        { id: 'Sons de Chuva', title: 'Sons de Chuva', artist: 'Vários Artistas' },
        { id: 'Quiet Resource - Evelyn', title: 'Quiet Resource', artist: 'Evelyn Stein' },
        { id: 'Saudade - Gabriel Albuquerque', title: 'Saudade', artist: 'Gabriel Albuquerque' },
        { id: 'Mix de Frases #1', title: 'Mix de Frases #1', artist: 'Vários Artistas' },
        { id: 'Mix de Frases #2', title: 'Mix de Frases #2', artist: 'Vários Artistas' },
    ];

    private timerService = inject(TimerService);
    private auth = inject(AuthService);
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

        async play(item: SoundItem) {
            // Toggle preview state; integrate real audio later.
            if (this.currentPreviewId === item.id) {
                await this.stopPreview(item);
                return;
            }
            // Start new preview
            this.currentPreviewId = item.id;
            if (this.previewTimeout) { clearTimeout(this.previewTimeout); this.previewTimeout = null; }
            const t = await this.toast.create({ message: `Reproduzindo prévia: ${item.title}`, duration: 1000, color: 'dark', position: 'bottom' });
            await t.present();
            // Auto-stop preview after a few seconds
            this.previewTimeout = setTimeout(() => {
                this.currentPreviewId = null;
                this.previewTimeout = null;
            }, 5000);
        }

        private async stopPreview(item: SoundItem) {
            if (this.previewTimeout) { clearTimeout(this.previewTimeout); this.previewTimeout = null; }
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
        isPlaying(item: SoundItem): boolean { return this.currentPreviewId === item.id; }

    scrollToAvailable() {
        const el = document.getElementById('available-section')
        if (el) {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            catch { el.scrollIntoView(); }
        }
    }

    back() { this.router.navigate(['/progress']); }
}
