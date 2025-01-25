import { openaiClient } from "./openai-client";
import { assistantRoster } from "./assistantRoster";

let inMemoryAssistantInstances = new Map(); 

export const assistantConfig = {
    id: "asst_CAjCQW3Lkif3FuAOFCQBaOh0",
}

export async function getMasterAssistantId() {
    const masterAssistantId = await openaiClient.beta.assistants.retrieve(
        assistantConfig.id
  );
  return masterAssistantId;
}

export async function getUserAssistantInstance(
  userId: string, 
  rosterConfig: typeof assistantRoster[0]
) {
  const mapKey = `${userId}:${rosterConfig.key}`;
  let instance = inMemoryAssistantInstances.get(mapKey);

  if (!instance) {
    const created = await openaiClient.beta.assistants.create({
      name: `${rosterConfig.name} (Clone for ${userId})`,
      instructions: rosterConfig.instructions,
      model: rosterConfig.model,
    });

    instance = {
      openAiAssistantId: created.id,
      baseAssistantKey: rosterConfig.key,
      userId: userId,
      // might store any additional needed details
    };

    inMemoryAssistantInstances.set(mapKey, instance);
  }

  return instance.openAiAssistantId; 
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