import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private baseUrl = environment.apiBaseUrl;

    private http = inject(HttpClient);

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('focus_now_token');
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        // Only attach Authorization header when not using cookie-based auth
        if (!environment.useCookies && token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    async get(endpoint: string): Promise<any> {
        try {
            const response = await this.http.get(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders() }).toPromise();
            return response;
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    }

    async post(endpoint: string, data: any): Promise<any> {
        try {
            const response = await this.http.post(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders() }).toPromise();
            return response;
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    }

    async put(endpoint: string, data: any): Promise<any> {
        try {
            const response = await this.http.put(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders() }).toPromise();
            return response;
        } catch (error) {
            console.error('API PUT error:', error);
            throw error;
        }
    }

    async delete(endpoint: string): Promise<any> {
        try {
            const response = await this.http.delete(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders() }).toPromise();
            return response;
        } catch (error) {
            console.error('API DELETE error:', error);
            throw error;
        }
    }
}