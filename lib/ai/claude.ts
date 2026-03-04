import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { DocumentType, AIProvider, AIProviderConfig } from '@/types';

// ─── SecureStore keys ─────────────────────────────────────────────────────────
const LEGACY_SECURE_KEY   = 'claude_api_key';       // legacy — read-only fallback
const SECURE_API_KEY      = 'ai_personal_key';
const SECURE_PROVIDER_KEY = 'ai_personal_provider';

// ─── Provider defaults ────────────────────────────────────────────────────────
const PROVIDER_CONFIG = {
  anthropic: {
    url:   'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
  },
  openai: {
    url:   'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  google: {
    model: 'gemini-2.0-flash',
    // URL is dynamic: ...googleapis.com/v1beta/models/{model}:generateContent?key={key}
  },
} as const;

// ─── Error class ──────────────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(
    message: string,
    public code: 'NO_API_KEY' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// Backward-compat alias — AIAssistModal and AIChatScreen import { ClaudeError }
export const ClaudeError = AIError;

// ─── Personal key (SecureStore) ───────────────────────────────────────────────

export async function savePersonalProviderKey(provider: AIProvider, key: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_API_KEY, key),
    SecureStore.setItemAsync(SECURE_PROVIDER_KEY, provider),
  ]);
}

export async function getPersonalProviderConfig(): Promise<AIProviderConfig | null> {
  const [newKey, storedProvider] = await Promise.all([
    SecureStore.getItemAsync(SECURE_API_KEY),
    SecureStore.getItemAsync(SECURE_PROVIDER_KEY),
  ]);
  if (newKey && newKey.length > 10) {
    return { provider: (storedProvider as AIProvider) ?? 'anthropic', apiKey: newKey };
  }
  // Fall back to legacy key — treat as anthropic
  const legacyKey = await SecureStore.getItemAsync(LEGACY_SECURE_KEY);
  if (legacyKey && legacyKey.length > 10) {
    return { provider: 'anthropic', apiKey: legacyKey };
  }
  return null;
}

export async function removePersonalProviderKey(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_API_KEY),
    SecureStore.deleteItemAsync(SECURE_PROVIDER_KEY),
  ]);
}

// Legacy compat exports
export async function saveClaudeApiKey(key: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(LEGACY_SECURE_KEY, key),
    SecureStore.setItemAsync(SECURE_API_KEY, key),
    SecureStore.setItemAsync(SECURE_PROVIDER_KEY, 'anthropic'),
  ]);
}

export async function getPersonalApiKey(): Promise<string | null> {
  const config = await getPersonalProviderConfig();
  return config?.apiKey ?? null;
}

// ─── Workspace key (Firestore) ────────────────────────────────────────────────

export async function saveWorkspaceProviderKey(
  workspaceId: string,
  provider: AIProvider,
  key: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), {
    aiProvider: provider,
    aiApiKey: key,
  });
}

export async function getWorkspaceProviderConfig(
  workspaceId: string
): Promise<AIProviderConfig | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const newKey = data?.aiApiKey;
    if (newKey && newKey.length > 10) {
      return { provider: (data?.aiProvider as AIProvider) ?? 'anthropic', apiKey: newKey };
    }
    // Fall back to legacy claudeApiKey
    const legacyKey = data?.claudeApiKey;
    if (legacyKey && legacyKey.length > 10) {
      return { provider: 'anthropic', apiKey: legacyKey };
    }
    return null;
  } catch {
    return null;
  }
}

export async function removeWorkspaceProviderKey(workspaceId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), {
    aiProvider: '',
    aiApiKey: '',
  });
}

// Legacy compat exports
export async function saveWorkspaceApiKey(workspaceId: string, key: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), {
    claudeApiKey: key,
    aiApiKey: key,
    aiProvider: 'anthropic',
  });
}

export async function removeWorkspaceApiKey(workspaceId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), {
    claudeApiKey: '',
    aiApiKey: '',
    aiProvider: '',
  });
}

export async function getWorkspaceApiKey(workspaceId: string): Promise<string | null> {
  const config = await getWorkspaceProviderConfig(workspaceId);
  return config?.apiKey ?? null;
}

// ─── Key resolution ───────────────────────────────────────────────────────────
// Priority: personal (device) → workspace (Firestore) → env var (Anthropic only)

export async function getActiveProvider(workspaceId?: string): Promise<AIProviderConfig | null> {
  const personal = await getPersonalProviderConfig();
  if (personal) return personal;

  if (workspaceId) {
    const workspace = await getWorkspaceProviderConfig(workspaceId);
    if (workspace) return workspace;
  }

  const envKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (envKey && envKey.length > 10) return { provider: 'anthropic', apiKey: envKey };

  return null;
}

// Legacy compat
export async function getClaudeApiKey(workspaceId?: string): Promise<string | null> {
  const config = await getActiveProvider(workspaceId);
  return config?.apiKey ?? null;
}

// ─── AIChatMessage (exported, unchanged) ─────────────────────────────────────

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Provider-specific API call functions (private) ───────────────────────────

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: AIChatMessage[],
  maxTokens: number
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(PROVIDER_CONFIG.anthropic.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.anthropic.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });
  } catch {
    throw new AIError('Network error contacting Anthropic API', 'NETWORK_ERROR');
  }

  if (response.status === 429) {
    throw new AIError('Rate limit exceeded. Please wait and try again.', 'RATE_LIMITED');
  }
  if (!response.ok) {
    let detail = '';
    try { const b = await response.json(); detail = b?.error?.message ?? ''; } catch {}
    throw new AIError(
      detail || `API error: ${response.status}`,
      response.status === 401 || response.status === 403 ? 'NO_API_KEY' : 'API_ERROR'
    );
  }
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: AIChatMessage[],
  maxTokens: number
): Promise<string> {
  const openAIMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,  // AIChatMessage roles 'user'|'assistant' match OpenAI exactly
  ];

  let response: Response;
  try {
    response = await fetch(PROVIDER_CONFIG.openai.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.openai.model,
        max_tokens: maxTokens,
        messages: openAIMessages,
      }),
    });
  } catch {
    throw new AIError('Network error contacting OpenAI API', 'NETWORK_ERROR');
  }

  if (response.status === 429) {
    throw new AIError('Rate limit exceeded. Please wait and try again.', 'RATE_LIMITED');
  }
  if (!response.ok) {
    let detail = '';
    try { const b = await response.json(); detail = b?.error?.message ?? ''; } catch {}
    throw new AIError(
      detail || `API error: ${response.status}`,
      response.status === 401 || response.status === 403 ? 'NO_API_KEY' : 'API_ERROR'
    );
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: AIChatMessage[],
  _maxTokens: number
): Promise<string> {
  const model = PROVIDER_CONFIG.google.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini uses 'model' instead of 'assistant'
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    });
  } catch {
    throw new AIError('Network error contacting Google Gemini API', 'NETWORK_ERROR');
  }

  if (response.status === 429) {
    throw new AIError('Rate limit exceeded. Please wait and try again.', 'RATE_LIMITED');
  }
  if (!response.ok) {
    let detail = '';
    try { const b = await response.json(); detail = b?.error?.message ?? ''; } catch {}
    // Gemini returns HTTP 400 for an invalid API key (not 401)
    throw new AIError(
      detail || `API error: ${response.status}`,
      response.status === 400 || response.status === 403 ? 'NO_API_KEY' : 'API_ERROR'
    );
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Unified dispatcher ───────────────────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  messages: AIChatMessage[],
  maxTokens: number,
  workspaceId?: string
): Promise<string> {
  const config = await getActiveProvider(workspaceId);
  if (!config) {
    throw new AIError('No AI API key configured.', 'NO_API_KEY');
  }
  switch (config.provider) {
    case 'anthropic': return callAnthropic(config.apiKey, systemPrompt, messages, maxTokens);
    case 'openai':    return callOpenAI(config.apiKey, systemPrompt, messages, maxTokens);
    case 'google':    return callGemini(config.apiKey, systemPrompt, messages, maxTokens);
    default:          throw new AIError('Unknown AI provider.', 'API_ERROR');
  }
}

// ─── Document AI functions ────────────────────────────────────────────────────

export async function generateDocumentContent(
  docType: DocumentType,
  userPrompt: string,
  workspaceId?: string
): Promise<string> {
  const systemPrompt = `You are a professional document writer helping users create ${docType} documents.
Generate clear, well-structured content based on the user's instruction.
Return only the document content — no explanations, no markdown wrappers.`;
  return callAI(systemPrompt, [{ role: 'user', content: userPrompt }], 2048, workspaceId);
}

export async function improveText(
  existingContent: string,
  instruction: string,
  docType: DocumentType,
  workspaceId?: string
): Promise<string> {
  const systemPrompt = `You are a professional editor helping improve ${docType} documents.
Rewrite or improve the provided content based on the user's instruction.
Return only the improved content — no explanations, no preamble.`;
  const userMessage = `Instruction: ${instruction}\n\nExisting content:\n${existingContent}`;
  return callAI(systemPrompt, [{ role: 'user', content: userMessage }], 2048, workspaceId);
}

export async function summarizeDocument(content: string, workspaceId?: string): Promise<string> {
  const systemPrompt = `You are a professional summarizer.
Provide a concise 2-3 sentence summary of the provided document content.`;
  return callAI(systemPrompt, [{ role: 'user', content }], 512, workspaceId);
}

// ─── Conversational AI chat ───────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are an AI assistant embedded in Collabo-Pro — a secure team collaboration app.
Help team members with questions, brainstorming, drafting messages, summarizing information, and general productivity tasks.
Be concise, friendly, and professional. Keep responses brief unless detail is specifically requested.`;

export async function chatWithClaude(
  messages: AIChatMessage[],
  workspaceId?: string
): Promise<string> {
  return callAI(CHAT_SYSTEM_PROMPT, messages, 1024, workspaceId);
}
