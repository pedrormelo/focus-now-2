import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
    id: number;
    nome?: string;
    username?: string;
    email: string;
    objetivo?: string;
    nivel?: number;
    xp?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiBaseUrl}/api`;
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private http = inject(HttpClient);

    constructor() {
        this.loadStoredUser();
    }

    private loadStoredUser(): void {
        const storedUser = localStorage.getItem('focus_now_user');
        if (storedUser) {
            this.currentUserSubject.next(JSON.parse(storedUser));
        }
    }

    async login(email: string, password: string): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.http.post<any>(`${this.apiUrl}/login`, { email, senha: password })
            );

            if (response?.user) {
                localStorage.setItem('focus_now_user', JSON.stringify(response.user));
                // Only persist token locally if not using cookie-based auth
                if (!environment.useCookies && response?.token) {
                    localStorage.setItem('focus_now_token', response.token);
                }
                this.currentUserSubject.next(response.user);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async register(nome: string, email: string, senha: string, objetivo?: string): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.http.post<any>(`${this.apiUrl}/register`, { nome, email, senha, objetivo })
            );
            // Do NOT auto-login; user should login explicitly after registration
            return !!response?.user?.id;
        } catch {
            return false;
        }
    }

    async logout(): Promise<void> {
        try {
            // Clear server cookie (if using cookie auth)
            await firstValueFrom(this.http.post(`${this.apiUrl}/logout`, {}));
        } catch { /* ignore */ }
        localStorage.removeItem('focus_now_user');
        localStorage.removeItem('focus_now_token');
        this.currentUserSubject.next(null);
    }

    isAuthenticated(): boolean {
        return !!this.currentUserSubject.value;
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    getToken(): string | null {
        if (environment.useCookies) return null; // not used
        return localStorage.getItem('focus_now_token');
    }

    // Merge partial updates (e.g., xp/nivel) into the current user and persist
    updateCurrentUser(partial: Partial<User>): void {
        const cur = this.currentUserSubject.value || ({} as User);
        const updated: User = { ...cur, ...partial } as User;
        this.currentUserSubject.next(updated);
        try {
            localStorage.setItem('focus_now_user', JSON.stringify(updated));
        } catch { /* ignore */ }
    }
}