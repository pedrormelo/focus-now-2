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
  currentStreak = 0;
  bestStreak = 0;
  conquistas: Array<{ nome: string; descricao: string; alcançada: boolean }> = [];
  // MVP: treat alarm sound selection as discovery progress
  alarmSounds = ['Alarme Padrão', 'Sino', 'Digital', 'Natureza'];
  musicFound = 0;

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
    this.loadStreak();
    this.loadDiasFoco();
    this.buildCalendar();
  }

  loadEstatisticas() {
    this.timerService.getEstatisticas().subscribe({
      next: (stats: any) => {
        this.estatisticas = stats;
        this.updateComputed();
      },
      error: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
  }

  loadStreak() {
    this.timerService.getStreak().subscribe({
      next: (s: any) => {
        this.currentStreak = s?.currentStreak || 0;
        this.bestStreak = s?.bestStreak || 0;
        this.updateComputed();
      },
      error: (err) => {
        console.error('Erro ao carregar streak:', err);
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.updateComputed();
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
    return this.musicFound;
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

  private loadDiasFoco() {
    const first = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth(), 1);
    const last = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth() + 1, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const start = fmt(first), end = fmt(last);

    this.timerService.getDiasFoco(start, end).subscribe((res: any) => {
      const days = Array.isArray(res?.days) ? res.days : [];
      const newSet = new Set<string>();
      let totalMin = 0;
      let dayCount = 0;
      for (const d of days) {
        const dia = d.dia || d.DIA || d.date;
        const minutos = Number(d.minutos_foco || 0);
        if (dia && minutos > 0) {
          newSet.add(String(dia));
          totalMin += minutos;
          dayCount += 1;
        }
      }
      const avg = dayCount > 0 ? (totalMin / dayCount) : 0;
      this.avgFocusHoursPerDay = Math.round((avg / 60) * 10) / 10;
      this.focusDateSet = newSet;
      this.buildCalendar();
    }, () => {
      // Fallback to historico if daily aggregates fail
      this.loadHistoricoFallbackForMonth(first, last);
    });
  }

  // Month navigation for the calendar
  prevMonth() {
    this.monthDate = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth() - 1, 1);
    this.loadDiasFoco();
    this.buildCalendar();
  }
  nextMonth() {
    this.monthDate = new Date(this.monthDate.getFullYear(), this.monthDate.getMonth() + 1, 1);
    this.loadDiasFoco();
    this.buildCalendar();
  }

  // Fallback: use historico (last 50) to mark focus days in current month
  private loadHistoricoFallbackForMonth(first: Date, last: Date) {
    const startKey = this.dateKey(first);
    const endKey = this.dateKey(last);
    const inRange = (d: Date) => {
      const k = this.dateKey(d);
      return k >= startKey && k <= endKey;
    };
    this.timerService.getHistorico().subscribe((items: any) => {
      const arr = Array.isArray(items) ? items : [];
      const newSet = new Set<string>();
      const perDayMinutes = new Map<string, number>();
      arr.forEach((it: any) => {
        if (it.tipo === 'foco' && it.completado) {
          const dt = new Date(it.data_criacao);
          if (!inRange(dt)) return;
          const key = this.dateKey(dt);
          newSet.add(key);
          const prev = perDayMinutes.get(key) || 0;
          perDayMinutes.set(key, prev + (it.duracao || 0));
        }
      });
      const days = perDayMinutes.size || 1;
      const totalMin = Array.from(perDayMinutes.values()).reduce((a, b) => a + b, 0);
      this.avgFocusHoursPerDay = Math.round((totalMin / days) / 60 * 10) / 10;
      this.focusDateSet = newSet;
      this.buildCalendar();
    }, () => {
      // keep calendar without highlights
      this.buildCalendar();
    });
  }

  get achievementsPercent(): number {
    const total = this.conquistas.length || 1;
    return Math.round((this.getConquistasAlcancadas() / total) * 100);
  }

  get musicPercent(): number {
    const total = this.alarmSounds.length || 1;
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

  private updateComputed() {
    const stats = this.estatisticas || {};
    const completed = Number(stats.ciclos_completados || 0);
    const cfg = this.timerService.getTimerConfig();
    this.musicFound = cfg.alarmSound && cfg.alarmSound !== 'Alarme Padrão' ? 1 : 0;

    this.conquistas = [
      { nome: 'Tudo Se Inicia', descricao: 'Finalizar primeiro ciclo', alcançada: completed >= 1 },
      { nome: 'Pegando Jeito', descricao: 'Finalizar 4 ciclos', alcançada: completed >= 4 },
      { nome: 'Seguindo o Foco', descricao: 'Tenha uma sequência de 4 dias', alcançada: this.currentStreak >= 4 },
      { nome: 'Achando o Ritmo', descricao: 'Escolha um som de alarme', alcançada: this.musicFound >= 1 },
      { nome: 'Dançando', descricao: 'Explore 4 sons diferentes', alcançada: false },
      { nome: 'Acontece...', descricao: 'Perca uma sequência', alcançada: this.currentStreak === 0 && completed > 0 }
    ];
  }
}