import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, IonicModule, LogoComponent],
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss']
})
export class InfoPage { }
