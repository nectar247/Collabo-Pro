declare module 'expo-av' {
  interface AudioRecordingInstance {
    stopAndUnloadAsync: () => Promise<void>;
    getURI: () => string | null;
  }

  export namespace Audio {
    class Recording {
      stopAndUnloadAsync(): Promise<void>;
      getURI(): string | null;
      static createAsync(options: unknown): Promise<{ recording: Recording }>;
    }
    const RecordingOptionsPresets: { HIGH_QUALITY: unknown };
    function requestPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }>;
    function setAudioModeAsync(options: {
      allowsRecordingIOS?: boolean;
      playsInSilentModeIOS?: boolean;
    }): Promise<void>;
  }
}
