import OpenAI from "openai";

import { getVoiceInterviewEnv } from "@/lib/env";

let openAiClientSingleton: OpenAI | null = null;

export function getServerOpenAiClient() {
  if (!openAiClientSingleton) {
    const env = getVoiceInterviewEnv();
    openAiClientSingleton = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openAiClientSingleton;
}
