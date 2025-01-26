import { openaiClient } from "./openai-client";
import { assistantRoster } from "./assistantRoster";
import type { AssistantCreateParams } from "openai/resources/beta/assistants";

// Define types for better type safety
type AssistantRosterConfig = typeof assistantRoster[0];
type AssistantInstance = {
  openAiAssistantId: string;
  baseAssistantKey: string;
  userId: string;
  createdAt: Date;
};

const inMemoryAssistantInstances = new Map<string, AssistantInstance>();

export const assistantConfig = {
    id: "asst_CAjCQW3Lkif3FuAOFCQBaOh0",
};

export async function getMasterAssistantId() {
    console.log('[Assistant Config] Retrieving master assistant:', assistantConfig.id);
    const masterAssistantId = await openaiClient.beta.assistants.retrieve(
        assistantConfig.id
    );
    console.log('[Assistant Config] Master assistant retrieved successfully');
    return masterAssistantId;
}

export function findRosterConfig(key: string): AssistantRosterConfig | undefined {
    return assistantRoster.find(config => config.key === key);
}

export async function getUserAssistantInstance(
  userId: string, 
  assistantKey: string
): Promise<string> {
  if (!userId || !assistantKey) {
    throw new Error('userId and assistantKey are required');
  }

  console.log('[Assistant Config] Getting instance for user:', userId, 'with roster key:', assistantKey);
  
  const rosterConfig = findRosterConfig(assistantKey);
  if (!rosterConfig) {
    throw new Error(`No assistant configuration found for key: ${assistantKey}`);
  }

  const mapKey = `${userId}:${assistantKey}`;
  let instance = inMemoryAssistantInstances.get(mapKey);

  if (!instance) {
    console.log('[Assistant Config] No existing instance found, creating new assistant');
    console.log('[Assistant Config] Roster config:', {
      name: rosterConfig.name,
      key: rosterConfig.key,
      model: rosterConfig.model,
      instructionsLength: rosterConfig.instructions?.length || 0
    });

    try {
      const created = await openaiClient.beta.assistants.create({
        name: `${rosterConfig.name} (Clone for ${userId})`,
        instructions: rosterConfig.instructions || '',
        model: rosterConfig.model || 'gpt-4o',
        tools: (rosterConfig.tools || []) as AssistantCreateParams['tools'],
      });
      console.log('[Assistant Config] New assistant created with ID:', created.id);

      instance = {
        openAiAssistantId: created.id,
        baseAssistantKey: assistantKey,
        userId: userId,
        createdAt: new Date()
      };

      inMemoryAssistantInstances.set(mapKey, instance);
      console.log('[Assistant Config] Instance cached in memory');
    } catch (error) {
      console.error('[Assistant Config] Error creating assistant:', error);
      throw error;
    }
  } else {
    console.log('[Assistant Config] Found existing instance:', instance.openAiAssistantId);
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