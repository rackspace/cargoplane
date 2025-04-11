import {Component} from '@angular/core';
import {ChatComponent} from "./chat/chat.component";

@Component({
  selector: 'app-root',
  imports: [ChatComponent],
  template: `
    <h1>Welcome to {{title}}!</h1>
    <app-chat></app-chat>
  `,
  styles: [],
})
export class AppComponent {
  title = 'ng-cargoplane-demo';
}
