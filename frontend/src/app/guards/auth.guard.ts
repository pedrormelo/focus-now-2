import { Injectable, inject } from '@angular/core';
import { CanLoad, CanMatch, Route, UrlSegment, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad, CanMatch {

  private authService = inject(AuthService);
  private router = inject(Router);

  canLoad(): boolean | UrlTree {
    return this.check();
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    return this.check();
  }

  private check(): boolean | UrlTree {
    if (this.authService.isAuthenticated()) return true;
    return this.router.createUrlTree(['/login']);
  }
}