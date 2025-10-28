import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { TimerService } from '../../services/timer.service';

interface Conquista {
    nome: string;
    descricao: string;
    alcancada: boolean;
}

@Component({
    selector: 'app-achievements',
    templateUrl: './achievements.page.html',
    styleUrls: ['./achievements.page.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, LogoComponent, BottomNavComponent]
})
export class AchievementsPage implements OnInit {
    conquistas: Conquista[] = [];
    estatisticas: any = {};
    currentStreak = 0;
    musicFound = 0;

    private timerService = inject(TimerService);
    private router = inject(Router);

    ngOnInit(): void {
        this.loadData();
    }

    private loadData() {
        this.timerService.getEstatisticas().subscribe({
            next: (stats: any) => {
                this.estatisticas = stats || {};
                this.compose();
            },
            error: () => this.compose()
        });
        this.timerService.getStreak().subscribe({
            next: (s: any) => {
                this.currentStreak = s?.currentStreak || 0;
                this.compose();
            },
            error: () => this.compose()
        });
        this.musicFound = this.timerService.getDiscoveredSoundsCount();
    }

    private compose() {
        const completed = Number(this.estatisticas.ciclos_completados || 0);
        const totalCiclos = Number(this.estatisticas.total_ciclos || 0);
        const ciclosFoco = Number(this.estatisticas.ciclos_foco || 0);
        const totalMin = Number(this.estatisticas.total_minutos || 0);
        const totalHours = totalMin / 60;
        const breaksCount = Math.max(0, totalCiclos - ciclosFoco);
    const musicExploredCount = this.musicFound;

        this.conquistas = [
            // Início e primeiros passos
            { nome: 'Tudo Se Inicia', descricao: 'Finalizar primeiro ciclo.', alcancada: completed >= 1 },
            { nome: 'Pegando Jeito', descricao: 'Finalizar 4 ciclos.', alcancada: completed >= 4 },
            { nome: 'No Ritmo', descricao: 'Finalizar 10 ciclos.', alcancada: completed >= 10 },
            { nome: 'Em Frente', descricao: 'Finalizar 25 ciclos.', alcancada: completed >= 25 },
            { nome: 'Centenário', descricao: 'Finalizar 100 ciclos.', alcancada: completed >= 100 },

            // Tempo total em foco
            { nome: '5H de Foco', descricao: 'Alcançar 5 horas de foco.', alcancada: totalHours >= 5 },
            { nome: '10H de Foco', descricao: 'Alcançar 10 horas de foco.', alcancada: totalHours >= 10 },
            { nome: '25H de Foco', descricao: 'Alcançar 25 horas de foco.', alcancada: totalHours >= 25 },

            // Streaks
            { nome: 'Seguindo o Foco', descricao: 'Tenha uma sequência de 4 dias.', alcancada: this.currentStreak >= 4 },
            { nome: 'Semana de Ouro', descricao: 'Chegue a 7 dias seguidos.', alcancada: this.currentStreak >= 7 },
            { nome: 'Foguete Não Tem Ré', descricao: 'Mantenha 14 dias seguidos.', alcancada: this.currentStreak >= 14 },

            // Pausas (estimado a partir dos ciclos)
            { nome: 'Respira', descricao: 'Complete 10 pausas.', alcancada: breaksCount >= 10 },
            { nome: 'Zen Master', descricao: 'Complete 50 pausas.', alcancada: breaksCount >= 50 },

            // Música e sons
            { nome: 'Achando o Ritmo', descricao: 'Encontre a primeira música.', alcancada: musicExploredCount >= 1 },
            { nome: 'Dançando', descricao: 'Encontre quatro músicas.', alcancada: musicExploredCount >= 4 },

            // Vários
            { nome: 'Acontece...', descricao: 'Perca uma sequência.', alcancada: this.currentStreak === 0 && completed > 0 }
        ];
    }

    back() { this.router.navigate(['/progress']); }

    get conquistasAlcancadas() { return this.conquistas.filter(c => c.alcancada).length; }
}
