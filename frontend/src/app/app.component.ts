import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private settings = inject(SettingsService);
  private sub?: Subscription;

  ngOnInit(): void {
    // Enforce dark theme for all users regardless of system theme
    this.settings.setPartial({ temaEscuro: true });
    // Force Ionic dark palette (class-based) and Tailwind dark variants
    document.documentElement.classList.add('ion-palette-dark');
    document.body.classList.add('dark');
    // Apply theme on startup and whenever settings change
    this.sub = this.settings.settings$.subscribe(s => {
      // Keep Tailwind dark class consistent (but we force it on by default)
      document.body.classList.toggle('dark', !!s.temaEscuro);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
