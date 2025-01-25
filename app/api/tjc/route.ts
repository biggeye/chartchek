import { NextRequest } from "next/server";
import OpenAI from "openai";

// Our helper imports
import { cloneAssistantForUser } from "@/lib/assistant-config";
import { openaiClient } from "../../../lib/openai-client";

export async function POST(req: NextRequest) {
    try {
        console.log("Received request");

        // 1) Parse the body
        const { userMessage, threadId, userId } = await req.json();
        console.log("Parsed request body:", { userMessage, threadId, userId });

        // 3) If no threadId, create a new thread with the user's message. Otherwise, append the message.
        let localThreadId = threadId;
        if (!localThreadId) {
            console.log("No threadId provided, creating a new thread");
            const newThread = await openaiClient.beta.threads.create();
            localThreadId = newThread.id;
            console.log("Created new thread with id:", localThreadId);
        } else {
            console.log("Using existing threadId:", localThreadId);
        }

        // Add the user's message to the thread
        await openaiClient.beta.threads.messages.create(localThreadId, {
            role: "user",
            content: userMessage,
        });
        console.log("Added user message to thread:", userMessage);

        // 4) Stream the run
        const run = openaiClient.beta.threads.runs.stream(localThreadId, {
            assistant_id: "asst_CAjCQW3Lkif3FuAOFCQBaOh0",
        });
        console.log("Started streaming run for thread:", localThreadId);

        // 5) Convert run events to an SSE stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                function sendData(data) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                }

                run
                    .on("textCreated", (text) => {
                        console.log("textCreated event:", text);
                        sendData({ type: "textCreated", value: text });
                    })
                    .on("textDelta", (textDelta) => {
                        console.log("textDelta event:", textDelta);
                        sendData({ type: "textDelta", value: textDelta.value });
                    })
                    .on("toolCallCreated", (toolCall) => {
                        console.log("toolCallCreated event:", toolCall);
                        sendData({ type: "toolCallCreated", toolCall });
                    })
                    .on("toolCallDelta", (toolCallDelta) => {
                        console.log("toolCallDelta event:", toolCallDelta);
                        sendData({ type: "toolCallDelta", toolCallDelta });
                    })
                    .on("messageDone", (message) => {
                        console.log("messageDone event:", message);
                        sendData({ type: "messageDone", message });
                    })
                    .on("end", () => {
                        console.log("Stream ended");
                        controller.close();
                    })
                    .on("error", (err) => {
                        console.error("Stream error:", err);
                        controller.error(err);
                    });
            },
        });

        // 6) Return SSE response
        console.log("Returning SSE response");
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err) {
        console.error("Error in POST handler:", err);
        return new Response("Error: " + err.message, { status: 500 });
    }
}
