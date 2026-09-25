import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";

import { firebaseApp } from "./firebase";

const DEFAULT_QUOTA_RETRY_MS = 60_000;

let quotaRetryAt = 0;

export class TranslationQuotaError extends Error {
  constructor(retryAfterMs: number) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    super(
      `Translation requests are temporarily limited. Please try again in about ${retryAfterSeconds} seconds.`
    );
    this.name = "TranslationQuotaError";
  }
}

function retryAfterMsFromError(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const retryMatch = error.message.match(
    /(?:retry(?:Delay)?["\s:]+|retry in )([0-9]+(?:\.[0-9]+)?)\s*s/i
  );

  if (!retryMatch) {
    return null;
  }

  return Math.ceil(Number(retryMatch[1]) * 1000);
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (/\b429\b/.test(error.message) ||
      /quota exceeded|rate limit|resource exhausted/i.test(error.message))
  );
}

export function getTranslationErrorMessage(error: unknown): string {
  if (error instanceof TranslationQuotaError) {
    return error.message;
  }

  if (isQuotaError(error)) {
    return "Translation requests are temporarily limited. Please try again shortly.";
  }

  return "Unable to translate this post right now. Please try again.";
}

const ai = getAI(firebaseApp, {
  backend: new GoogleAIBackend(),
});

const translationModel = getGenerativeModel(ai, {
  model: "gemini-3.6-flash",
});

export async function translatePost(
  title: string,
  content: string,
  targetLanguage: string
): Promise<{ title: string; content: string }> {
  const sourceTitle = title?.trim() ?? "";
  const sourceContent = content?.trim() ?? "";
  const language = targetLanguage?.trim() ?? "";

  if (!sourceTitle) {
    throw new Error("Post title is required.");
  }

  if (!sourceContent) {
    throw new Error("Post content is required.");
  }

  if (!language) {
    throw new Error("Target language is required.");
  }

  const remainingQuotaDelay = quotaRetryAt - Date.now();

  if (remainingQuotaDelay > 0) {
    throw new TranslationQuotaError(remainingQuotaDelay);
  }

  const postTranslationSchema = Schema.object({
    properties: {
      title: Schema.string(),
      content: Schema.string(),
    },
  });

  const postTranslationModel = getGenerativeModel(ai, {
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: postTranslationSchema,
    },
  });

  try {
    const result = await postTranslationModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Translate this community post into ${language}. Preserve the meaning and natural tone. Return the translated title and content as JSON.

Title:
${sourceTitle}

Content:
${sourceContent}`,
            },
          ],
        },
      ],
    });

    const parsed = JSON.parse(result.response.text()) as {
      title?: unknown;
      content?: unknown;
    };

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.content !== "string"
    ) {
      throw new Error("Invalid translation response.");
    }

    return {
      title: parsed.title.trim(),
      content: parsed.content.trim(),
    };
  } catch (error) {
    if (isQuotaError(error)) {
      const retryAfterMs =
        retryAfterMsFromError(error) ?? DEFAULT_QUOTA_RETRY_MS;

      quotaRetryAt = Date.now() + retryAfterMs;
      throw new TranslationQuotaError(retryAfterMs);
    }

    throw error;
  }
}

export async function translateText(
  sourceText: string,
  targetLanguage: string
): Promise<string> {
  const text = sourceText?.trim() ?? "";
  const language = targetLanguage?.trim() ?? "";

  if (!text) {
    throw new Error("Source text is required.");
  }

  if (!language) {
    throw new Error("Target language is required.");
  }

  const remainingQuotaDelay = quotaRetryAt - Date.now();
  if (remainingQuotaDelay > 0) {
    throw new TranslationQuotaError(remainingQuotaDelay);
  }

  try {
    const result = await translationModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Translate the following text into ${language}. Return only the translated text and nothing else.\n\n${text}`,
            },
          ],
        },
      ],
    });

    return result.response.text().trim();
  } catch (error) {
    if (isQuotaError(error)) {
      const retryAfterMs =
        retryAfterMsFromError(error) ?? DEFAULT_QUOTA_RETRY_MS;
      quotaRetryAt = Date.now() + retryAfterMs;
      throw new TranslationQuotaError(retryAfterMs);
    }

    throw error;
  }
}
