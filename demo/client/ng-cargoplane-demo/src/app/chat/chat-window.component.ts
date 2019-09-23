import {Component, OnInit, Input, OnDestroy} from '@angular/core';
import {ChatService} from './chat.service';
import {ChatMessage} from '../model/chat';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html'
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  @Input() topic: string;

  chats: string[];
  subscription?: Subscription;

  constructor(private chatService: ChatService) {
  }

  ngOnInit() {
    this.chats = [];

    this.subscription = this.chatService.observe(this.topic)
      .subscribe(message => {
        this.chats.push((message as ChatMessage).text);
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
