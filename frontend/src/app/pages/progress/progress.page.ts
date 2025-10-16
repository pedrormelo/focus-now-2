import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProgressPage implements OnInit {
  estatisticas: any = {};
  conquistas = [
    { nome: 'Tudo Se Inicia', descricao: 'Finalizar primeiro ciclo', alcançada: true },
    { nome: 'Pegando Jeito', descricao: 'Finalizar 4 ciclos', alcançada: true },
    { nome: 'Achando o Ritmo', descricao: 'Encontre a primeira música', alcançada: false },
    { nome: 'Dançando', descricao: 'Encontre quatro músicas', alcançada: false },
    { nome: 'Seguindo o Foco', descricao: 'Tenha uma sequência de 4 dias', alcançada: true },
    { nome: 'Acontece...', descricao: 'Perca uma sequência', alcançada: false }
  ];

  musicas = [
    { nome: 'Sons da Floresta', artista: 'Vários Artistas', encontrada: true },
    { nome: 'Sons de Chuva', artista: 'Vários Artistas', encontrada: true },
    { nome: 'Quiet Resource', artista: 'Evelyn Stein', encontrada: true },
    { nome: 'Saudade', artista: 'Gabriel Albuquerque', encontrada: false },
    { nome: 'Mix de Frases #1', artista: 'Vários Artistas', encontrada: false },
    { nome: 'Mix de Frases #2', artista: 'Vários Artistas', encontrada: false },
    { nome: 'Mix de Frases #3', artista: 'Vários Artistas', encontrada: false }
  ];

  constructor(
    private timerService: TimerService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadEstatisticas();
  }

  loadEstatisticas() {
    this.timerService.getEstatisticas().subscribe({
      next: (stats: any) => {
        this.estatisticas = stats;
      },
      error: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
  }

  async openAchievements() {
    // TODO: Implement achievements modal
    console.log('Achievements modal not implemented yet');
  }

  getConquistasAlcancadas() {
    return this.conquistas.filter(c => c.alcançada).length;
  }

  getMusicasEncontradas() {
    return this.musicas.filter(m => m.encontrada).length;
  }
}