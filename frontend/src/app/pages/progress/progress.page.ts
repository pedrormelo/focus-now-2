import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TimerService } from '../../services/timer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../../components/logo/logo.component';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LogoComponent, BottomNavComponent]
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

  // Calendar state
  monthDate = new Date();
  weeks: Array<Array<{ date: Date | null; inMonth: boolean; focused: boolean }>> = [];
  private focusDateSet = new Set<string>();
  avgFocusHoursPerDay = 0;

  constructor(
    private timerService: TimerService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadEstatisticas();
    this.loadHistorico();
    this.buildCalendar();
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

  // --- Calendar and metrics helpers ---
  get monthLabel(): string {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
    const m = formatter.format(this.monthDate);
    const capitalized = m.charAt(0).toUpperCase() + m.slice(1);
    return `${capitalized}`;
  }

  get daysOfWeek(): string[] {
    return ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
  }

  private buildCalendar() {
    const first = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth(), 1);
    const last = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth() + 1, 0);
    const startOffset = first.getDay(); // 0=Sun
    const totalDays = last.getDate();

    const cells: Array<{ date: Date | null; inMonth: boolean; focused: boolean }> = [];
    // Leading blanks
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, inMonth: false, focused: false });
    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth(), d);
      const key = this.dateKey(date);
      cells.push({ date, inMonth: true, focused: this.focusDateSet.has(key) });
    }
    // Trailing to complete weeks (up to 6 rows max)
    while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false, focused: false });

    // Split into weeks
    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) this.weeks.push(cells.slice(i, i + 7));
  }

  private dateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private loadHistorico() {
    this.timerService.getHistorico().subscribe((items: any) => {
        const arr = Array.isArray(items) ? items : [];
        // Consider only completed focus cycles
        const perDayMinutes = new Map<string, number>();
        arr.forEach((it: any) => {
          if (it.tipo === 'foco' && it.completado) {
            const dt = new Date(it.data_criacao);
            const key = this.dateKey(dt);
            this.focusDateSet.add(key);
            const prev = perDayMinutes.get(key) || 0;
            perDayMinutes.set(key, prev + (it.duracao || 0));
          }
        });

        // Average hours/day over the focused days (fallback to 0)
        const days = perDayMinutes.size || 1;
        const totalMin = Array.from(perDayMinutes.values()).reduce((a, b) => a + b, 0);
        this.avgFocusHoursPerDay = Math.round((totalMin / days) / 60 * 10) / 10;

        this.buildCalendar();
      }, (/* error */) => {
        // Keep calendar without focus highlights if API fails
        this.buildCalendar();
      }
    );
  }

  get achievementsPercent(): number {
    const total = this.conquistas.length || 1;
    return Math.round((this.getConquistasAlcancadas() / total) * 100);
  }

  get musicPercent(): number {
    const total = this.musicas.length || 1;
    return Math.round((this.getMusicasEncontradas() / total) * 100);
  }

  get focusHours(): number {
    return Math.round(((this.estatisticas.total_minutos || 0) / 60) * 10) / 10;
  }

  get focusHoursPercent(): number {
    // Map focus hours to a 0-100% bar, clamped with a reasonable daily cap (12h)
    const pct = Math.round((this.focusHours / 12) * 100);
    return Math.max(0, Math.min(100, pct));
  }
}