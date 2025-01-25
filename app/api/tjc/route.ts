// app/api/tjc/route.ts
import { NextRequest } from "next/server";
import { getUserAssistantInstance } from "@/lib/assistantConfig";
import { openaiClient } from "@/lib/openai-client";

export async function POST(req: NextRequest) {
  try {
    // parse request
    const { userMessage, assistantId, assistantKey, threadId, userId, model } = await req.json();

    // fallback user
    const safeUserId = userId || "guestUser"; // no real auth yet

    // 1) figure out the actual assistant ID
    let localAssistantId = assistantId;
    if (!localAssistantId) {
      if (!assistantKey) {
        throw new Error("Must provide either assistantId or assistantKey");
      }
      // create or retrieve user-specific clone
      localAssistantId = await getUserAssistantInstance(safeUserId, assistantKey);
    }

    // 2) figure out the thread
    let localThreadId = threadId;
    if (!localThreadId) {
      const newThread = await openaiClient.beta.threads.create();
      localThreadId = newThread.id;
    }

    // 3) add user message
    await openaiClient.beta.threads.messages.create(localThreadId, {
      role: "user",
      content: userMessage,
    });

    // 4) set up the SSE streaming
    const run = openaiClient.beta.threads.runs.stream(localThreadId, {
      assistant_id: localAssistantId,
      model: model || "gpt-4", // Use provided model or fallback to gpt-4
    });

    // 5) Convert to SSE...
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        function sendData(data: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        run
          .on("textCreated", (text) => {
            sendData({ type: "textCreated", value: text, threadId: localThreadId });
          })
          .on("textDelta", (textDelta) => {
            sendData({ type: "textDelta", value: textDelta.value });
          })
          .on("toolCallCreated", (toolCall) => {
            sendData({ type: "toolCallCreated", toolCall });
          })
          .on("toolCallDelta", (toolCallDelta) => {
            sendData({ type: "toolCallDelta", toolCallDelta });
          })
          .on("messageDone", (message) => {
            sendData({ type: "messageDone", message });
          })
          .on("end", () => {
            try {
              controller.close();
            } catch {}
          })
          .on("error", (err) => {
            try {
              controller.error(err);
              controller.close();
            } catch {}
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response("Error: " + err.message, { status: 500 });
  }
}
