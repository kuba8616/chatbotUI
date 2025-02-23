import { Component, signal } from '@angular/core';
import { ApiResponse, ChatbotService, ChatResponse } from './services/chatbot.service';
import { Rating } from './enums/rating.enum';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    MatListModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    NgIf,
    FormsModule,
  ],
})
export class AppComponent {
  Rating = Rating;
  chatHistory = signal<ChatResponse[]>([]);
  newMessageValue = '';
  isGeneratingResponse = signal(false);
  private currentResponseId: number | null = null;

  constructor(private chatbotService: ChatbotService) {
    this.loadChatHistory();
  }

  loadChatHistory(): void {
    this.chatbotService.getChatHistory().subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.chatHistory.set(response.value || []);
          console.log('Historia czatu:', response.value);
        } else {
          console.error('Błąd w odpowiedzi API:', response.message);
        }
      },
      error: (error) => {
        console.error('Błąd podczas pobierania historii czatu:', error);
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageValue.trim()) return;

    const randomResponseId = Math.floor(Math.random() * 2_147_483_647) + 1;
    const messageContent = {
      content: this.newMessageValue,
      responseId: randomResponseId
    };
    this.newMessageValue = '';
    this.isGeneratingResponse.set(true);
    this.currentResponseId = messageContent.responseId

    this.chatbotService.sendMessage(messageContent).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.currentResponseId = response.value.id;
          this.simulateTyping(response.value);
        } else {
          this.isGeneratingResponse.set(false);
          console.error('Błąd przy wysyłaniu wiadomości:', response.message);
        }
      },
      error: (error) => {
        this.isGeneratingResponse.set(false);
        console.error('Błąd podczas wysyłania wiadomości:', error);
      }
    });
  }

  private simulateTyping(response: ChatResponse): void {
    const fullResponse = response.response;
    let currentText = '';
    const interval = setInterval(() => {
      if (currentText.length < fullResponse.length && this.isGeneratingResponse()) {
        currentText = fullResponse.slice(0, currentText.length + 1);
        this.chatHistory.set([
          ...this.chatHistory().filter((msg) => msg.id !== response.id),
          { ...response, response: currentText, isCancelled: false },
        ]);
      } else {
        clearInterval(interval);
        this.chatHistory.set([...this.chatHistory(), { ...response, isCancelled: false }]);
        this.isGeneratingResponse.set(false);
        this.currentResponseId = null;
      }
    }, 50);
  }

  rateResponse(responseId: number, rating: Rating): void {
    this.chatbotService.rateResponse(responseId, rating).subscribe(() => {
      this.chatHistory.set(
        this.chatHistory().map((msg) =>
          msg.id === responseId ? { ...msg, rating } : msg
        )
      );
    });
  }

  cancelResponse(): void {
    if (this.currentResponseId !== null) {
      this.chatbotService.cancelResponse(this.currentResponseId).subscribe({
        next: () => {
          this.isGeneratingResponse.set(false);
          this.currentResponseId = null;
          const currentMessages = this.chatHistory();
          const updatedMessages = currentMessages.map(msg =>
            msg.id === this.currentResponseId ? { ...msg, isCancelled: true } : msg
          ).sort((a, b) => a.id - b.id);
          this.chatHistory.set(updatedMessages);
        },
        error: (error) => {
          console.error('Błąd podczas anulowania odpowiedzi:', error);
        }
      });
    } else {
      console.warn('Nie można anulować – currentResponseId jest null');
    }
  }

  trackById(index: number, item: ChatResponse): number {
    return item.id;
  }
}
