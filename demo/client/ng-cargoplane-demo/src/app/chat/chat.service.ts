import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {CargoplaneClient, CargoplaneCredential} from '@cargoplane/client';
import {ChatMessage} from '../model/chat';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  /**
   * Construct this service.
   *
   * @param http HTTP call needed to call Lambdas
   * @param cargoplane inject CargoplaneClient here.
   *    Since ChatService contains all use of it though, we could easily have
   *    not made CargoplaneClient be a service in app.module.ts, and instead
   *    simply contained an instance in this class.
   */
  constructor(private readonly http: HttpClient,
              private readonly cargoplane: CargoplaneClient) {

    console.log('ChatService.constructor');
    this.reconnect().then();
  }

  private async reconnect() {
    // Get Credentials from cloud
    const credentialsPath = environment.apiUrl + 'credentials';
    const credential = await this.http.get(credentialsPath).toPromise() as CargoplaneCredential;

    // Connect to Cargoplane
    await this.cargoplane.connect(credential);

    // Schedule next reconnect 60s before timeout
    const now = Date.now();
    const expire = Date.parse(credential.expiration);
    const waitMs = expire - now - 60000;
    if (waitMs > 0) {
      console.log('Credential renewal in', waitMs / 1000, 'seconds');
      setTimeout(() => this.reconnect(), waitMs);
    }
  }

  /**
   * Obtain an RxJs Observable to chat messages.
   * @param topic topic to subscribe
   * @returns Observable that will receive events when chat message are received.
   */
  observe(topic): Observable<ChatMessage> {
    console.log('subscribing');
    return (this.cargoplane.observe(topic) as any) as Observable<ChatMessage>;
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
      this.http.post(publishUrl, body).toPromise()
        .then(() => {
          console.log('success');
        });
    }
  }

}
