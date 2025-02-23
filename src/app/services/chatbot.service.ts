import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rating } from '../enums/rating.enum';

export interface ChatMessage {
  id: number;
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  id: number;
  message: string;
  response: string;
  rating: Rating;
  isCancelled?: boolean;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  value: T;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private apiUrl = 'http://localhost:5230/api/chat';

  constructor(private http: HttpClient) {}

  getChatHistory(): Observable<ApiResponse<ChatResponse[]>> {
    return this.http.get<ApiResponse<ChatResponse[]>>(`${this.apiUrl}/history`);
  }

  sendMessage(content: { content: string }): Observable<ApiResponse<ChatResponse>> {
    return this.http.post<ApiResponse<ChatResponse>>(`${this.apiUrl}/messages`, content);
  }

  rateResponse(responseId: number, rating: Rating): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/responses/${responseId}/rate`, { responseId, rating });
  }

  cancelResponse(responseId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cancel`, { responseId });
  }
}
