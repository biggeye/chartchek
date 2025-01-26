// app/api/tjc/route.ts
import { NextRequest } from "next/server";
import { getUserAssistantInstance } from "@/lib/assistantConfig";
import { openaiClient } from "@/lib/openai-client";

export async function POST(req: NextRequest) {
  try {
    // parse request
    const { userMessage, assistantId, assistantKey, threadId, userId, model } = await req.json();
    console.log('[TJC API] Received request:', { 
      hasUserMessage: !!userMessage, 
      assistantId, 
      assistantKey: !!assistantKey, 
      threadId,
      userId,
      model 
    });

    // fallback user
    const safeUserId = userId || "guestUser"; // no real auth yet
    console.log('[TJC API] Using userId:', safeUserId);

    // 1) figure out the actual assistant ID
    let localAssistantId = assistantId;
    if (!localAssistantId) {
      if (!assistantKey) {
        throw new Error("Must provide either assistantId or assistantKey");
      }
      console.log('[TJC API] Creating/retrieving user-specific assistant for key:', assistantKey);
      // create or retrieve user-specific clone
      localAssistantId = await getUserAssistantInstance(safeUserId, assistantKey);
    }
    console.log('[TJC API] Using assistant ID:', localAssistantId);

    // 2) figure out the thread
    let localThreadId = threadId;
    if (!localThreadId) {
      console.log('[TJC API] Creating new thread');
      const newThread = await openaiClient.beta.threads.create();
      localThreadId = newThread.id;
    }
    console.log('[TJC API] Using thread ID:', localThreadId);

    // 3) add user message
    console.log('[TJC API] Adding user message to thread');
    await openaiClient.beta.threads.messages.create(localThreadId, {
      role: "user",
      content: userMessage,
    });

    // 4) set up the SSE streaming
    console.log('[TJC API] Setting up SSE stream with model:', model || "gpt-4o");
    const run = openaiClient.beta.threads.runs.stream(localThreadId, {
      assistant_id: localAssistantId,
      model: model || "gpt-4o", // Use provided model or fallback to gpt-4
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
            console.log('[TJC API] Text created event');
            sendData({ type: "textCreated", value: { text: text.value }, threadId: localThreadId });
          })
          .on("textDelta", (textDelta) => {
            sendData({ type: "textDelta", value: { text: textDelta.value } });
          })
          .on("toolCallCreated", (toolCall) => {
            console.log('[TJC API] Tool call created:', toolCall.type);
            sendData({ type: "toolCallCreated", toolCall });
          })
          .on("toolCallDelta", (toolCallDelta) => {
            sendData({ type: "toolCallDelta", toolCallDelta });
          })
          .on("messageDone", (message) => {
            console.log('[TJC API] Message completed');
            sendData({ type: "messageDone", message });
          })
          .on("end", () => {
            console.log('[TJC API] Stream ended');
            try {
              controller.close();
            } catch (err) {
              console.error('[TJC API] Error closing controller:', err);
            }
          })
          .on("error", (err) => {
            console.error('[TJC API] Stream error:', err);
            try {
              controller.error(err);
              controller.close();
            } catch (err) {
              console.error('[TJC API] Error handling stream error:', err);
            }
          });
      },
    });

    console.log('[TJC API] Returning SSE response');
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error('[TJC API] Error in POST handler:', err);
    return new Response("Error: " + err.message, { status: 500 });
  }
}
