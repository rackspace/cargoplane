import React from 'react';

import ChatLine from './chat-line';
import ChatService from "./chat.service";

class ChatWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chats: []
        }
    }

    componentDidMount() {
        ChatService.observe(this.props.topic)
            .subscribe(message => {
                console.log(message);
                let chats = this.state.chats;
                chats.push((message).text);
                this.setState({
                    chats: chats 
                });
            });
    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div>
                <ul className="chat-list">
                    {this.state.chats.map((line, idx) =>
                        <ChatLine key={idx.toString()} line={line}></ChatLine>
                    )}
                </ul>
            </div>
        )
    }
}

export default ChatWindow;
