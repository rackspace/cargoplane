import {CargoplaneClient} from "@cargoplane/client";
import Axios from "axios";

export class ChatService {
  constructor() {
    console.log("ChatService.constructor");

    if (!process.env.REACT_APP_API_URL) {
      throw new Error("Environment variable REACT_APP_API_URL not defined");
    }

    this.cargoplane = new CargoplaneClient();
    this._reconnect().then();
  }

  async _reconnect() {
    // Get Credentials from cloud
    console.log("API_URL: " + process.env.REACT_APP_API_URL);
    let credentialsPath = process.env.REACT_APP_API_URL + "credentials";

    // get the credentials from the endpoint
    const credential = (await Axios.get(credentialsPath)).data;

    // Connect to Cargoplane
    this.cargoplane.connect(credential)
        .subscribe(event => {
          console.log('Event from cargoplane:', event.type);
          if (event.type === 'expiring') {
            this._reconnect();
          }
        });
  }

  /**
   * Obtain an RxJs Observable to chat messages.
   * @param topic topic to subscribe
   * @returns Observable that will receive events when chat message are received.
   */
  observe(topic) {
    console.log("subscribing to ", topic);
    return this.cargoplane.observe(topic);
  }

  /**
   * Publish a message to chat
   */
  publish(topic, message) {
    const msg = {
      text: message
    };

    if (topic === "chattopic/mqtt") {
      this.cargoplane.publish(topic, msg);
    } else {
      console.log("publishing using HTTP");
      let publishUrl = process.env.REACT_APP_API_URL + "publish";
      let body = {
        topic: topic,
        text: message
      };
      Axios.post(publishUrl, body).then(() => {
        console.log("success");
      });
    }
  }
}

const instance = new ChatService();
Object.freeze(instance);
export default instance;
