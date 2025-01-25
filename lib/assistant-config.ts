import { openaiClient } from "./openai-client";

export const assistantConfig = {
    id: "asst_CAjCQW3Lkif3FuAOFCQBaOh0",
}

export async function getMasterAssistantConfig() {
    const masterAssistant = await openai.beta.assistants.retrieve(
        assistantConfig.id
  );
  return masterAssistant;
}
/*
export async function cloneAssistantForUser(userId: string) {
  const master = await getMasterAssistantConfig();

  const newAssistant = await openai.beta.assistants.create({
    name: `${master.name} (Clone for ${userId})`,
    instructions: master.instructions,
    model: master,
    tools: master.tools,
    tool_resources: master.tool_resources, 
  });

  return newAssistant;xx
}
*/