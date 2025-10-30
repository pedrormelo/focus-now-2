import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ProgressPage } from './progress.page';
import { TimerService } from '../../services/timer.service';

describe('ProgressPage', () => {
  let component: ProgressPage;
  let fixture: ComponentFixture<ProgressPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterTestingModule, ProgressPage],
      providers: [
        {
          provide: TimerService,
          useValue: {
            getEstatisticas: () => of({ total_minutos: 0, ciclos_completados: 0 }),
            getStreak: () => of({ currentStreak: 0, bestStreak: 0 }),
            getDiasFoco: () => of({ days: [] }),
            getHistorico: () => of([]),
            getTimerConfig: () => ({ pomodoro: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 }),
            // Updated mocks for music catalog progress
            getSoundCatalogTotal: () => 4,
            getDiscoveredCatalogCount: () => 0
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
