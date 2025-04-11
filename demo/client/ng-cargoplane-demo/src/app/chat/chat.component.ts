import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatWindowComponent} from "./chat-window.component";
import {ChatService} from './chat.service';

@Component({
  selector: 'app-chat',
  imports: [ChatWindowComponent, FormsModule],
  templateUrl: './chat.component.html',
  styles: `
    form {
      width: 100%;
      text-align: center;
    }

    .chatwindows {
      width: 100%;
      td {
        border: thin solid black;
        padding: 0 8px;
        vertical-align: top;
      }
    }
  `
})
export class ChatComponent {
  topic = 'chattopic/mqtt';
  text = '';

  constructor(private chatService: ChatService) {
  }

  onSubmit() {
    console.log('sending: ', this.text);
    this.chatService.publish(this.topic, this.text);
    this.text = "";
  }
}
