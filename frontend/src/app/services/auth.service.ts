import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface User {
    id: number;
    username: string;
    email: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/api'; // Corrigido para /api
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
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

            if (response?.user && response?.token) {
                localStorage.setItem('focus_now_user', JSON.stringify(response.user));
                localStorage.setItem('focus_now_token', response.token);
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

    logout(): void {
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
        return localStorage.getItem('focus_now_token');
    }
}