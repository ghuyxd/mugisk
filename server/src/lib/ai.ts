import { OpenAI } from "openai";

export function isAiEnabled(): boolean {
  const key = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  return Boolean(key && key.trim() !== "" && baseUrl && baseUrl.trim() !== "");
}

let aiClient: OpenAI | null = null;

export function getAiClient(): OpenAI | null {
  if (!isAiEnabled()) {
    return null;
  }
  
  if (!aiClient) {
    aiClient = new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL,
    });
  }
  
  return aiClient;
}
