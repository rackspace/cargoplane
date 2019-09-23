import {Component} from '@angular/core';
import {ChatService} from './chat.service';
import {FormGroup, FormControl} from '@angular/forms';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  chatForm = new FormGroup({
    topic: new FormControl('chattopic/mqtt'),
    text: new FormControl('')
  });

  constructor(private chatService: ChatService) {
  }

  onSubmit() {
    const topic = this.chatForm.value.topic;

    // TODO: Use EventEmitter with form value
    console.log('sending: ', this.chatForm.value);
    if (this.chatForm.value.text) {
      this.chatService.publish(topic, this.chatForm.value.text);
      this.chatForm.controls.text.patchValue('');
    }
  }
}
