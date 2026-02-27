import * as SecureStore from 'expo-secure-store';
import type { DocumentType } from '@/types';

const SECURE_KEY = 'claude_api_key';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022';

export class ClaudeError extends Error {
  constructor(
    message: string,
    public code: 'NO_API_KEY' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'API_ERROR'
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export async function saveClaudeApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY, key);
}

export async function getClaudeApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY);
}

async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    throw new ClaudeError(
      'No Claude API key configured. Go to Profile → Settings to add one.',
      'NO_API_KEY'
    );
  }

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    throw new ClaudeError('Network error contacting Claude API', 'NETWORK_ERROR');
  }

  if (response.status === 429) {
    throw new ClaudeError('Rate limit exceeded. Please wait and try again.', 'RATE_LIMITED');
  }

  if (!response.ok) {
    throw new ClaudeError(`API error: ${response.status}`, 'API_ERROR');
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

// Generate document content from scratch
export async function generateDocumentContent(
  docType: DocumentType,
  userPrompt: string
): Promise<string> {
  const systemPrompt = `You are a professional document writer helping users create ${docType} documents.
Generate clear, well-structured content based on the user's instruction.
Return only the document content — no explanations, no markdown wrappers.`;

  return callClaude(systemPrompt, userPrompt);
}

// Improve existing document text
export async function improveText(
  existingContent: string,
  instruction: string,
  docType: DocumentType
): Promise<string> {
  const systemPrompt = `You are a professional editor helping improve ${docType} documents.
Rewrite or improve the provided content based on the user's instruction.
Return only the improved content — no explanations, no preamble.`;

  const userMessage = `Instruction: ${instruction}\n\nExisting content:\n${existingContent}`;
  return callClaude(systemPrompt, userMessage);
}

// Summarize document content
export async function summarizeDocument(content: string): Promise<string> {
  const systemPrompt = `You are a professional summarizer.
Provide a concise 2-3 sentence summary of the provided document content.`;

  return callClaude(systemPrompt, content);
}
