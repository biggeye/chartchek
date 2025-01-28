import React, { useState } from "react";

const SubmitForm: React.FC = () => {
    const [userMessage, setUserMessage] = useState("");
    const [response, setResponse] = useState("");
    const [threadId, setThreadId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch("/api/tjc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userMessage,
                    threadId: threadId,
                    assistantKey: "tjc",
                    userId: "guestUser"
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let currentResponse = "";

            while (!done && reader) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const events = chunk.split('\n').filter(Boolean);
                    
                    for (const event of events) {
                        try {
                            const parsedEvent = JSON.parse(event);
                            
                            if (parsedEvent.threadId && !threadId) {
                                setThreadId(parsedEvent.threadId);
                            }

                            if (parsedEvent.type === "textCreated") {
                                currentResponse = parsedEvent.value;
                                setResponse(currentResponse);
                            } else if (parsedEvent.type === "textDelta") {
                                currentResponse += parsedEvent.value;
                                setResponse(currentResponse);
                            }
                        } catch (e) {
                            console.error("Error parsing event:", e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setResponse("Error: Failed to send message");
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <textarea 
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Type your message..."
                        rows={4}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button 
                    type="submit"
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Send
                </button>
            </form>
            {response && (
                <div className="mt-4 p-4 border rounded">
                    <pre className="whitespace-pre-wrap">{response}</pre>
                </div>
            )}
        </div>
    );
};

export default SubmitForm;
