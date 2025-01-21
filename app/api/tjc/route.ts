import { NextRequest } from "next/server";
import OpenAI from "openai";

// Our helper imports
import { createAssistantForUser } from "@/lib/assistant-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // 1) Parse the body
    const { userMessage, threadId, userId, assistantId } = await req.json();

    // 2) If the user doesn't have an Assistant ID yet, create/clones one for them
    let localAssistantId = assistantId;
    if (!localAssistantId) {
      const newAssistant = await createAssistantForUser(userId || "anonymous");
      localAssistantId = newAssistant.id;
    }

    // 3) If no threadId, create a new thread with the user's message. Otherwise, append the message.
    let localThreadId = threadId;
    if (!localThreadId) {
      const newThread = await openai.beta.threads.create({
        messages: [
          { role: "user", content: userMessage },
        ],
      });
      localThreadId = newThread.id;
    } else {
      await openai.beta.threads.messages.create(localThreadId, {
        role: "user",
        content: userMessage,
      });
    }

    // 4) Stream the run
    const run = openai.beta.threads.runs.stream(localThreadId, {
      assistant_id: localAssistantId,
    });

    // 5) Convert run events to an SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        function sendData(data: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        run
          .on("textDelta", (delta) => {
            sendData({ type: "token", value: delta.value });
          })
          .on("toolCallCreated", (toolCall) => {
            sendData({ type: "toolCall", toolCall });
          })
          .on("toolCallDelta", (toolCallDelta) => {
            sendData({ type: "toolCallDelta", toolCallDelta });
          })
          .on("messageDone", (message) => {
            sendData({ type: "done", message });
          })
          .on("end", () => {
            controller.close();
          })
          .on("error", (err) => {
            console.error(err);
            controller.error(err);
          });
      },
    });

    // 6) Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error(err);
    return new Response("Error: " + err.message, { status: 500 });
  }
}
