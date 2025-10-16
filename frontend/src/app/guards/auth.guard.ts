import { Injectable } from '@angular/core';
import { CanLoad, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canLoad(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Redirect to login page
    this.router.navigate(['/login']);
    return false;
  }
}