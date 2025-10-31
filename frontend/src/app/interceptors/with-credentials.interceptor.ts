import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class WithCredentialsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiBase = environment.apiBaseUrl;
    let modified = req;
    try {
      const isApiCall = typeof req.url === 'string' && req.url.startsWith(apiBase);
      if (isApiCall && environment.useCookies) {
        modified = req.clone({ withCredentials: true });
      }
    } catch { /* ignore */ }
    return next.handle(modified);
  }
}
