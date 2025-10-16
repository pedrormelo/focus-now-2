import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressPage } from './progress.page';
import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { ProgressPageRoutingModule } from './progress-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    ProgressPageRoutingModule
  ]
})
export class ProgressPageModule {}
