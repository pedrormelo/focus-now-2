import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
    selector: 'app-achievements-modal',
    templateUrl: './achievements-modal.page.html',
    styleUrls: ['./achievements-modal.page.scss'],
})
export class AchievementsModalPage {
    @Input() conquistas: any[] = [];

    constructor(private modalController: ModalController) { }

    close() {
        this.modalController.dismiss();
    }
}