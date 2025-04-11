import React from 'react';

import ChatWindow from './chat-window';
import ChatService from "./chat.service";

class Chat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: '',
            topic: 'chattopic/mqtt',
        };

        this.handleTextChange = this.handleTextChange.bind(this);
        this.handleTopicChange = this.handleTopicChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleTextChange(event) {
        this.setState({text: event.target.value});
    }

    handleTopicChange(event) {
        this.setState({topic: event.target.value});
    }

    handleSubmit(event) {
        console.log("submit");
        event.preventDefault();
        console.log(this.state.topic, this.state.text);
        ChatService.publish(this.state.topic, this.state.text);
        this.setState({
            text: ""
        });
    }

    render() {
        return (
            <div>
                <form onSubmit={this.handleSubmit}>
                    <label>Publish:
                        <input value={this.state.text} onChange={this.handleTextChange} placeholder="message" />
                    </label>
                    <label>
                        via
                        <select value={this.state.topic} onChange={this.handleTopicChange}>
                            <option value="chattopic/mqtt">MQTT</option>
                            <option value="chattopic/lambda">AWS Lambda</option>
                        </select>
                        <input type="submit" value="Submit"/>
                    </label>
                </form>
                <p></p>
                <div className="description">When sending a message via MQTT, the message will publish directly to MQTT from the browser to the topic <code>chattopic/mqtt</code>.</div>
                <div className="description">When sending a message via AWS Lambda, the message will be posted to an AWS Lambda via API Gateway.  The Lambda will then publish the message to the topic <code>chattopic/lambda</code>.</div>

                <table className="chatwindows">
                    <tbody>
                        <tr>
                            <td>
                                <h2>MQTT</h2>
                                <div className="description">This window is subscribing to the topic <code>chattopic/mqtt</code>.    </div>
                                <ChatWindow topic="chattopic/mqtt"></ChatWindow>
                            </td>
                            <td>
                                <h2>AWS Lambda</h2>
                                <div className="description">This window is subscribing to the topic <code>chattopic/lambda</code>.   </div>
                                <ChatWindow topic="chattopic/lambda"></ChatWindow>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )
    }
}

export default Chat;