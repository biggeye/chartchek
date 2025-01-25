import React from "react";

interface ChatInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSend: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend }) => {
    return (
        <div>
            <input type="text" value={value} onChange={onChange} />
            <button onClick={onSend}>Send</button>
        </div>
    );
};

export default ChatInput;
 