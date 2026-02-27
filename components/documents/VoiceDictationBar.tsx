import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { startDictation, stopDictation } from '@/lib/dictation';
import { useUIStore } from '@/store/uiStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface VoiceDictationBarProps {
  onStop: (finalTranscript: string) => void;
  onCancel: () => void;
}

export function VoiceDictationBar({ onStop, onCancel }: VoiceDictationBarProps) {
  const { dictationTranscript, appendDictationTranscript, clearDictationTranscript } = useUIStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cleanupRef = useRef<(() => void) | null>(null);

  // Start pulsing animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Start dictation on mount
  useEffect(() => {
    clearDictationTranscript();

    startDictation(
      (result) => {
        if (result.transcript && result.transcript !== '(Listening...)') {
          appendDictationTranscript(result.transcript);
        }
      },
      (error) => {
        console.warn('Dictation error:', error);
        onCancel();
      }
    )
      .then((cleanup) => {
        cleanupRef.current = cleanup;
      })
      .catch((err) => {
        console.warn('Failed to start dictation:', err);
        onCancel();
      });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  async function handleStop() {
    cleanupRef.current?.();
    const transcript = await stopDictation();
    const finalText = dictationTranscript || transcript;
    clearDictationTranscript();
    onStop(finalText);
  }

  function handleCancel() {
    cleanupRef.current?.();
    stopDictation();
    clearDictationTranscript();
    onCancel();
  }

  return (
    <View style={styles.container}>
      {/* Pulsing mic indicator */}
      <Animated.View style={[styles.micDot, { transform: [{ scale: pulseAnim }] }]} />

      {/* Transcript preview */}
      <Text style={styles.transcript} numberOfLines={2}>
        {dictationTranscript || 'Listening...'}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleStop} style={styles.stopBtn}>
          <Text style={styles.stopText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  micDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
  },
  transcript: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  stopBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  stopText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
