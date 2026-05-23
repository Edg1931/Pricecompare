import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI features."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Split a data URL (data:image/png;base64,XXXX) into media type + base64 data. */
export function parseDataUrl(dataUrl: string): {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  let mediaType = match[1];
  if (mediaType === "image/jpg") mediaType = "image/jpeg";
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(mediaType)) mediaType = "image/jpeg";
  return {
    mediaType: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    data: match[2],
  };
}
