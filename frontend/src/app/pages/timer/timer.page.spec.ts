import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TimerPage } from './timer.page';
import { TimerService } from '../../services/timer.service';

describe('TimerPage', () => {
  let component: TimerPage;
  let fixture: ComponentFixture<TimerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterTestingModule, TimerPage],
      providers: [
        {
          provide: TimerService,
          useValue: {
            // state
            completedCycles: 0,
            totalSeconds: 1500,
            currentTime: 1500,
            timerType: 'pomodoro',
            isRunning: false,
            isMuted: false,
            // streams expected by component
            completed$: of('pomodoro'),
            // methods used
            start: () => {},
            pause: () => {},
            stop: () => {},
            loadAppSettings: () => {},
            setMuted: (_: boolean) => {},
            getTimerConfig: () => ({ pomodoro: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 }),
            updateTimerConfig: (_: any) => {},
            setType: (_: any) => {}
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
