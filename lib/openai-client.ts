import OpenAI from "openai";

export const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    defaultHeaders: {
        "OpenAI-Beta": "assistants=v2",
    },
});

