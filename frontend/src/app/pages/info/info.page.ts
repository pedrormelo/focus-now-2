import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, IonicModule, LogoComponent],
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss']
})
export class InfoPage {
  private nav = inject(NavController);

  back() {
    // Try to go back in history; if none, fallback to home
    this.nav.back();
  }
}
