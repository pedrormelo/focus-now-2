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
    // Apply theme on startup and whenever settings change
    this.sub = this.settings.settings$.subscribe(s => {
      document.body.classList.toggle('dark', !!s.temaEscuro);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
