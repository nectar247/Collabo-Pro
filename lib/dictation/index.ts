import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export interface DictationResult {
  transcript: string;
  isFinal: boolean;
}

let recording: Audio.Recording | null = null;
let isActive = false;

// Request microphone permissions
async function requestPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

// Start audio recording for dictation
// Note: In Expo Go (managed workflow), this captures audio but does not
// auto-transcribe (requires a native build or external STT API).
// In a full native build, replace this with @react-native-voice/voice.
export async function startDictation(
  onResult: (result: DictationResult) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    onError(new Error('Microphone permission denied'));
    return () => {};
  }

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    isActive = true;

    // Provide a mock partial result in Expo Go to confirm dictation is active
    // In a production build, integrate with a STT API here
    onResult({ transcript: '(Listening...)', isFinal: false });

    // Return cleanup function
    return async () => {
      await stopDictation();
    };
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Failed to start recording'));
    return () => {};
  }
}

// Stop recording and return final transcript
// In Expo Go: returns audio file URI (can be sent to Whisper API)
// In native build: returns actual transcript from device STT
export async function stopDictation(): Promise<string> {
  if (!recording) return '';

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    isActive = false;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    // In Expo Go, return a placeholder transcript
    // To enable real STT: send `uri` to OpenAI Whisper or Google Speech-to-Text
    // Example (requires OPENAI_API_KEY):
    // const transcript = await sendToWhisper(uri);
    // return transcript;

    return uri
      ? '(Audio recorded — connect a transcription API for full dictation support)'
      : '';
  } catch {
    recording = null;
    isActive = false;
    return '';
  }
}

export function isDictating(): boolean {
  return isActive;
}

// ─── Text-to-Speech (document read-back) ─────────────────────────────────────

export interface SpeechOptions {
  rate?: number;   // 0.5 to 2.0, default 1.0
  pitch?: number;  // 0.5 to 2.0, default 1.0
  language?: string; // e.g. 'en-US'
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
