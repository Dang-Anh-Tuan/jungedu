import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import i18n from "i18next";
import { z } from "zod";

import { GEMINI_API_KEY, withModelFallback } from "../../config/env";
import { LIMITS, TIMING } from "../../config/constants";
import { JSON_ONLY_FOLLOWUP } from "../../prompts/gradingPrompts";

import { extractFirstJsonObject } from "./extractJson";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const sec = ms / 1000;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(i18n.t("errors.aiTimeout", { label, seconds: sec })));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Gọi Gemini (Google AI) với output JSON; validate bằng Zod.
 * API key: `VITE_GEMINI_API_KEY`.
 */
export async function callGeminiJson<T>({
  messages,
  schema,
  model,
  modelList,
  temperature = 0,
  maxOutputTokens = LIMITS.GRADING_MAX_TOKENS,
  timeoutMs = TIMING.AI_CHAT_TIMEOUT_MS,
}: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  schema: z.ZodType<T>;
  model: string;
  /** Danh sách model fallback — nếu truyền, tự động thử từng model khi bị rate-limit. */
  modelList?: readonly string[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const key = GEMINI_API_KEY.trim();
  if (!key) {
    throw new Error(i18n.t("errors.geminiMissingKey"));
  }

  /** Hàm gọi thực tế cho một model cụ thể. */
  async function runWithModel(activeModel: string): Promise<T> {
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    const systemInstruction =
      systemParts.length > 0 ? systemParts.join("\n\n") : undefined;

    const userText =
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n") +
      "\n\n" +
      JSON_ONLY_FOLLOWUP;

    const genAI = new GoogleGenerativeAI(key);
    const genModel = genAI.getGenerativeModel({
      model: activeModel,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    const result = await withTimeout(
      genModel.generateContent(userText),
      timeoutMs,
      `Gemini (${activeModel})`,
    );

    const raw = result.response.text()?.trim();
    if (!raw) {
      throw new Error(i18n.t("errors.geminiEmptyResponse"));
    }

    const rawLower = raw.toLowerCase();
    if (
      rawLower.includes('429') ||
      rawLower.includes('resource_exhausted') ||
      rawLower.includes('rate_limit') ||
      rawLower.includes('quota') ||
      rawLower.includes('too many requests') ||
      rawLower.includes('ratelimit')
    ) {
      throw new Error(raw);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(extractFirstJsonObject(raw));
    }

    return schema.parse(parsed);
  }

  const models = modelList && modelList.length > 0 ? modelList : [model];
  return withModelFallback(models, runWithModel);
}

/**
 * Gemini multimodal + JSON (một request): `parts` là luồng text / ảnh xen kẽ.
 */
export async function callGeminiJsonWithParts<T>({
  systemInstruction,
  parts,
  schema,
  model,
  modelList,
  temperature = 0,
  maxOutputTokens = LIMITS.GRADING_MAX_TOKENS,
  timeoutMs = TIMING.AI_CHAT_TIMEOUT_MS,
  jsonFollowup = JSON_ONLY_FOLLOWUP,
}: {
  systemInstruction?: string;
  parts: Part[];
  schema: z.ZodType<T>;
  model: string;
  /** Danh sách model fallback — tự động thử khi bị rate-limit. */
  modelList?: readonly string[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  jsonFollowup?: string;
}): Promise<T> {
  const key = GEMINI_API_KEY.trim();
  if (!key) {
    throw new Error(i18n.t("errors.geminiMissingKey"));
  }

  const tail: Part[] =
    jsonFollowup.trim().length > 0
      ? [{ text: `\n\n${jsonFollowup.trim()}` }]
      : [];

  async function runWithModel(activeModel: string): Promise<T> {
    const genAI = new GoogleGenerativeAI(key);
    const genModel = genAI.getGenerativeModel({
      model: activeModel,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    const result = await withTimeout(
      genModel.generateContent([...parts, ...tail]),
      timeoutMs,
      `Gemini (${activeModel})`,
    );

    const raw = result.response.text()?.trim();
    if (!raw) {
      throw new Error(i18n.t("errors.geminiEmptyResponse"));
    }

    const rawLower = raw.toLowerCase();
    if (
      rawLower.includes('429') ||
      rawLower.includes('resource_exhausted') ||
      rawLower.includes('rate_limit') ||
      rawLower.includes('quota') ||
      rawLower.includes('too many requests') ||
      rawLower.includes('ratelimit')
    ) {
      throw new Error(raw);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(extractFirstJsonObject(raw));
    }

    return schema.parse(parsed);
  }

  const models = modelList && modelList.length > 0 ? modelList : [model];
  return withModelFallback(models, runWithModel);
}
