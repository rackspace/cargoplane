import {CargoplaneClient} from "@cargoplane/client";
import Axios from "axios";

export class ChatService {
  constructor() {
    console.log("ChatService.constructor");

    if (!process.env.REACT_APP_API_URL) {
      throw new Error("Environment variable REACT_APP_API_URL not defined");
    }

    this.cargoplane = new CargoplaneClient();

    // Please path here
    console.log("API_URL: " + process.env.REACT_APP_API_URL);
    let credentialsPath = process.env.REACT_APP_API_URL + "credentials";

    // get the credentials from the endpoint
    Axios.get(credentialsPath).then(response => {
      //   console.log(response);
      this.cargoplane.connect(response.data);
    });
  }

  /**
   * Obtain an RxJs Observable to chat messages.
   * @param topic topic to subscribe
   * @returns Observable that will receive events when chat message are received.
   */
  observe(topic) {
    console.log("subscribing");
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
