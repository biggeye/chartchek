import OpenAI from "openai";

// We'll read the master assistant ID from ENV or code
const MASTER_ASSISTANT_ID = process.env.MASTER_ASSISTANT_ID || "asst_XXXXXX";

// Create a singleton OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function getMasterAssistantConfig() {
  // Retrieve the master assistant from the ID
  const masterAssistant = await openai.beta.assistants.retrieve(
    MASTER_ASSISTANT_ID
  );
  return masterAssistant;
}

export async function createAssistantForUser(userId: string) {
  // 1) Retrieve the master config
  const master = await getMasterAssistantConfig();

  // 2) Create a new assistant with the same instructions/tools, etc.
  const newAssistant = await openai.beta.assistants.create({
    name: `${master.name} (Clone for ${userId})`,
    instructions: master.instructions,
    model: master.model,
    tools: master.tools,
    tool_resources: master.tool_resources, 
  });

  // 3) (Optional) Store the new assistant’s ID in your DB:
  // db.insert({ user_id: userId, assistant_id: newAssistant.id })

  return newAssistant;
}
