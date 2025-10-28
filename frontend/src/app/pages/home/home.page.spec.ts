import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { HomePage } from './home.page';
import { AuthService } from '../../services/auth.service';
import { TimerService } from '../../services/timer.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterTestingModule, HomePage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser$: of({}),
            getCurrentUser: () => ({}),
            getToken: () => 'test-token',
            logout: () => {}
          }
        },
        {
          provide: TimerService,
          useValue: {
            getEstatisticas: () => of({ total_minutos: 0, ciclos_completados: 0 }),
            getStreak: () => of({ currentStreak: 0, bestStreak: 0 })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
