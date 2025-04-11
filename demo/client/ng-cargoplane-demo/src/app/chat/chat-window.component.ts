import {CommonModule} from "@angular/common";
import {Component, input, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {ChatMessage} from '../model/chat';
import {ChatService} from './chat.service';

@Component({
  selector: 'app-chat-window',
  imports: [CommonModule],
  template: `
    <div>
      <ul>
        <li *ngFor="let line of chatLines">{{ line }}</li>
      </ul>
    </div>`
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  topic = input.required<string>();

  protected chatLines: string[] = [];
  private subscription?: Subscription;

  constructor(private readonly chatService: ChatService) {
  }

  ngOnInit() {
    this.chatLines = [];

    this.subscription = this.chatService.observe(this.topic())
      .subscribe(message => {
        this.chatLines.push(message.text);
        console.log(message);
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }
}
