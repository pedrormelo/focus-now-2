import { Component, Input, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
    selector: 'app-achievements-modal',
    templateUrl: './achievements-modal.page.html',
    styleUrls: ['./achievements-modal.page.scss'],
})
export class AchievementsModalPage {
    @Input() conquistas: any[] = [];

    private modalController = inject(ModalController);

    close() {
        this.modalController.dismiss();
    }
}