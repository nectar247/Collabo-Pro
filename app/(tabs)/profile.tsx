import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { saveClaudeApiKey, getClaudeApiKey } from '@/lib/ai/claude';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [claudeKey, setClaudeKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Load the stored API key on mount
  useEffect(() => {
    getClaudeApiKey().then((key) => {
      if (key) {
        setSavedKey(key);
        setClaudeKey(key);
      }
    });
  }, []);

  async function handleSaveApiKey() {
    const trimmed = claudeKey.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a valid API key.');
      return;
    }
    setSavingKey(true);
    try {
      await saveClaudeApiKey(trimmed);
      setSavedKey(trimmed);
      Alert.alert('Saved', 'Claude API key saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    } finally {
      setSavingKey(false);
    }
  }

  async function handleRemoveApiKey() {
    Alert.alert(
      'Remove API Key',
      'This will disable AI assistance features. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await saveClaudeApiKey('');
            setSavedKey('');
            setClaudeKey('');
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  const keyIsSaved = savedKey.length > 0;
  const keyChanged = claudeKey.trim() !== savedKey;

  function maskKey(key: string): string {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 6) + '•'.repeat(Math.max(0, key.length - 10)) + key.slice(-4);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar
            user={{ displayName: user?.displayName ?? 'User', photoURL: user?.photoURL }}
            size={72}
          />
          <Text style={styles.displayName}>{user?.displayName ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          {user?.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}
        </View>

        {/* Account info */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <InfoRow label="Display Name" value={user?.displayName ?? '—'} />
          <Divider />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <Divider />
          <InfoRow
            label="Status"
            value={user?.status ?? 'online'}
            valueStyle={{ color: Colors.accent, textTransform: 'capitalize' }}
          />
        </View>

        {/* AI Settings */}
        <SectionHeader title="AI Assistance" />
        <View style={styles.card}>
          <Text style={styles.aiDesc}>
            Add your Claude API key to enable AI writing assistance within documents.
            Your key is stored securely on this device only.
          </Text>

          {keyIsSaved && !showKey && (
            <View style={styles.keyStatus}>
              <View style={styles.keyStatusDot} />
              <Text style={styles.keyStatusText}>API key saved</Text>
              <Text style={styles.keyMasked}>{maskKey(savedKey)}</Text>
            </View>
          )}

          <View style={styles.keyInputRow}>
            <TextInput
              style={styles.keyInput}
              value={claudeKey}
              onChangeText={setClaudeKey}
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textDim}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.showHideBtn}
              onPress={() => setShowKey(!showKey)}
            >
              <Text style={styles.showHideBtnText}>{showKey ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyActions}>
            <TouchableOpacity
              style={[
                styles.saveKeyBtn,
                (!keyChanged || savingKey) && styles.saveKeyBtnDisabled,
              ]}
              onPress={handleSaveApiKey}
              disabled={!keyChanged || savingKey}
            >
              <Text style={styles.saveKeyBtnText}>
                {savingKey ? 'Saving…' : keyIsSaved ? 'Update Key' : 'Save Key'}
              </Text>
            </TouchableOpacity>

            {keyIsSaved && (
              <TouchableOpacity style={styles.removeKeyBtn} onPress={handleRemoveApiKey}>
                <Text style={styles.removeKeyBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.apiKeyLink}
            onPress={() => {
              Alert.alert(
                'Get a Claude API Key',
                'Visit console.anthropic.com to create an account and generate an API key.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.apiKeyLinkText}>How do I get an API key? →</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Text style={styles.switchDesc}>Get notified about messages and approvals</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* Sign out */}
        <SectionHeader title="Account Actions" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Collabo-Pro v1.0.0</Text>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Sub-components

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  bio: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  infoValue: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  // AI key section
  aiDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  keyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.accent}22`,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  keyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  keyStatusText: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  keyMasked: {
    flex: 1,
    color: Colors.textDim,
    fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
  },
  keyInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text,
    fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  showHideBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  showHideBtnText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  keyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveKeyBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  saveKeyBtnDisabled: {
    opacity: 0.4,
  },
  saveKeyBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  removeKeyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.danger}66`,
    alignItems: 'center',
  },
  removeKeyBtnText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  apiKeyLink: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  apiKeyLinkText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  // Preferences
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  switchLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  switchDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  // Sign out
  signOutBtn: {
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.danger}55`,
  },
  signOutBtnText: {
    color: Colors.danger,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  version: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
