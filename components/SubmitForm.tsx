import React, { useState } from "react";

const SubmitForm: React.FC = () => {
    const [userMessage, setUserMessage] = useState("");
    const [response, setResponse] = useState("");

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
                    threadId: "", // Add logic to handle threadId if needed
                    userId: "", // Add logic to handle userId if needed
                    assistantId: "" // Add logic to handle assistantId if needed
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done && reader) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunk = decoder.decode(value, { stream: true });
                const parsedChunk = JSON.parse(chunk);

                if (parsedChunk.type === "textCreated" || parsedChunk.type === "textDelta") {
                    setResponse((prevResponse) => prevResponse + parsedChunk.value);
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        type="text"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                    />
                </div>
                <button type="submit">Submit</button>
            </form>
            <div>{response}</div>
        </div>
    );
};

export default SubmitForm;

