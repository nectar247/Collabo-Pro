// Voice dictation lib
// Audio recording via expo-av is deferred — expo-av 16.x is not yet
// compatible with Expo SDK 55's native module system.
// Text-to-speech (expo-speech) works fully.
// Recording stubs return graceful no-ops so the UI can still be shown.
import * as Speech from 'expo-speech';

export interface DictationResult {
  transcript: string;
  isFinal: boolean;
}

let isActive = false;

export async function startDictation(
  onResult: (result: DictationResult) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  isActive = true;
  // Inform the UI that dictation mode is active (recording not yet wired)
  onResult({ transcript: '(Dictation not yet available — tap Stop)', isFinal: false });
  return () => { isActive = false; };
}

export async function stopDictation(): Promise<string> {
  isActive = false;
  return '';
}

export function isDictating(): boolean {
  return isActive;
}

// ─── Text-to-Speech (document read-back) ─────────────────────────────────────

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  language?: string;
}

export function speakText(text: string, options?: SpeechOptions): void {
  Speech.speak(text, {
    rate: options?.rate ?? 1.0,
    pitch: options?.pitch ?? 1.0,
    language: options?.language ?? 'en-US',
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
