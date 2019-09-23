import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-chat-line',
  templateUrl: './chat-line.component.html',
  styleUrls: ['./chat-line.component.scss']
})
export class ChatLineComponent {

  @Input() line: string;
}
