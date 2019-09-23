import React from 'react';

class ChatLine extends React.Component {
    render() {
        return (
            <li>{this.props.line}</li>
        )
    }
}

export default ChatLine;