import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {CargoplaneClient, CargoplaneCredential} from '@cargoplane/client';
import {lastValueFrom, Observable} from 'rxjs';
import {environment} from '../environment';
import {ChatMessage} from '../model/chat';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  /* Note: May only be one instance of this in the entire app! */
  private readonly cargoplane = new CargoplaneClient();

  /**
   * Construct this service.
   *
   * @param http HTTP call needed to call Lambdas
   */
  constructor(private readonly http: HttpClient) {

    console.log('ChatService.constructor');
    this.reconnect().then();
  }

  private async reconnect() {
    // Get Credentials from cloud
    const credentialsPath = environment.apiUrl + 'credentials';
    const credential = await this.http.get(credentialsPath).toPromise() as CargoplaneCredential;

    // Connect to Cargoplane
    this.cargoplane.connect(credential)
      .subscribe(event => {
        console.log('Event from cargoplane:', event.type);
        if (event.type === 'expiring') {
          this.reconnect();
        }
      });
  }

  /**
   * Obtain an RxJs Observable to chat messages.
   * @param topic topic to subscribe
   * @returns Observable that will receive events when chat message are received.
   */
  observe(topic: string): Observable<ChatMessage> {
    console.log('subscribing');
    return this.cargoplane.observe<ChatMessage>(topic);
  }

  /**
   * Publish a message to chat
   */
  publish(topic: string, message: string): void {
    const msg: ChatMessage = {
      text: message,
    };

    if (topic === 'chattopic/mqtt') {
      this.cargoplane.publish(topic, msg);
    } else {
      console.log('publishing via Lambda');
      const publishUrl = environment.apiUrl + 'publish';
      const body = {
        topic,
        text: message
      };
      lastValueFrom(this.http.post(publishUrl, body))
        .then(() => {
          console.log('success');
        });
    }
  }

}
