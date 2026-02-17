const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  model?: string;
  temperature?: number;
  responseFormat?: "text" | "json_object";
  timeoutMs?: number;
};

function getOpenAiApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

function getOpenAiModel(override?: string) {
  const model = override?.trim() || process.env.OPENAI_MODEL?.trim();
  return model || DEFAULT_OPENAI_MODEL;
}

function getOpenAiTimeoutMs(override?: number) {
  if (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override;
  }

  const fromEnv = Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  return 45000;
}

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiChatCompletionPayload = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: {
    type: "json_object";
  };
};

function isUnsupportedTemperatureError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("temperature") &&
    (normalized.includes("unsupported value") ||
      normalized.includes("does not support") ||
      normalized.includes("default (1)"))
  );
}

async function requestChatCompletion(
  apiKey: string,
  payload: OpenAiChatCompletionPayload,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = (await response
      .json()
      .catch(() => null)) as OpenAiChatCompletionResponse | null;

    return {
      response,
      body,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function createOpenAiChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const timeoutMs = getOpenAiTimeoutMs(options.timeoutMs);

  const basePayload: OpenAiChatCompletionPayload = {
    model: getOpenAiModel(options.model),
    messages,
    ...(options.responseFormat === "json_object"
      ? {
          response_format: { type: "json_object" as const },
        }
      : {}),
  };

  const firstPayload: OpenAiChatCompletionPayload =
    typeof options.temperature === "number"
      ? {
          ...basePayload,
          temperature: options.temperature,
        }
      : basePayload;

  let { response, body } = await requestChatCompletion(
    apiKey,
    firstPayload,
    timeoutMs,
  );

  if (
    !response.ok &&
    typeof options.temperature === "number" &&
    isUnsupportedTemperatureError(body?.error?.message ?? "")
  ) {
    const retryResult = await requestChatCompletion(
      apiKey,
      basePayload,
      timeoutMs,
    );
    response = retryResult.response;
    body = retryResult.body;
  }

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${body?.error?.message ?? response.statusText}`,
    );
  }

  const content = body?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty completion.");
  }

  return content;
}

export function canUseOpenAi() {
  return Boolean(getOpenAiApiKey());
}
