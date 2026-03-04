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
import { useUIStore } from '@/store/uiStore';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Avatar } from '@/components/ui/Avatar';
import {
  savePersonalProviderKey,
  getPersonalProviderConfig,
  removePersonalProviderKey,
  saveWorkspaceProviderKey,
  getWorkspaceProviderConfig,
  removeWorkspaceProviderKey,
} from '@/lib/ai/claude';
import type { AIProvider } from '@/types';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

const KEY_PLACEHOLDER: Record<AIProvider, string> = {
  anthropic: 'sk-ant-...',
  openai:    'sk-...',
  google:    'AIza...',
};

const API_KEY_INFO: Record<AIProvider, { label: string; url: string }> = {
  anthropic: { label: 'Anthropic', url: 'console.anthropic.com' },
  openai:    { label: 'OpenAI',    url: 'platform.openai.com/api-keys' },
  google:    { label: 'Google AI Studio', url: 'aistudio.google.com/app/apikey' },
};

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic',
  openai:    'OpenAI',
  google:    'Gemini',
};

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { activeWorkspaceId } = useUIStore();
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId);

  // Personal key state
  const [personalKey, setPersonalKey] = useState('');
  const [savedPersonalKey, setSavedPersonalKey] = useState('');
  const [personalProvider, setPersonalProvider] = useState<AIProvider>('anthropic');
  const [savedPersonalProvider, setSavedPersonalProvider] = useState<AIProvider>('anthropic');
  const [showPersonalKey, setShowPersonalKey] = useState(false);
  const [savingPersonalKey, setSavingPersonalKey] = useState(false);

  // Workspace key state (owner only edit)
  const [workspaceKey, setWorkspaceKey] = useState('');
  const [savedWorkspaceKey, setSavedWorkspaceKey] = useState('');
  const [workspaceProvider, setWorkspaceProvider] = useState<AIProvider>('anthropic');
  const [savedWorkspaceProvider, setSavedWorkspaceProvider] = useState<AIProvider>('anthropic');
  const [showWorkspaceKey, setShowWorkspaceKey] = useState(false);
  const [savingWorkspaceKey, setSavingWorkspaceKey] = useState(false);

  const [notifications, setNotifications] = useState(true);

  const isOwner = !!activeWorkspace && activeWorkspace.ownerId === user?.id;

  // Load personal config on mount
  useEffect(() => {
    getPersonalProviderConfig().then((config) => {
      if (config) {
        setPersonalKey(config.apiKey);
        setSavedPersonalKey(config.apiKey);
        setPersonalProvider(config.provider);
        setSavedPersonalProvider(config.provider);
      }
    });
  }, []);

  // Load workspace config when workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return;
    getWorkspaceProviderConfig(activeWorkspaceId).then((config) => {
      if (config) {
        setWorkspaceKey(config.apiKey);
        setSavedWorkspaceKey(config.apiKey);
        setWorkspaceProvider(config.provider);
        setSavedWorkspaceProvider(config.provider);
      } else {
        setWorkspaceKey('');
        setSavedWorkspaceKey('');
        setWorkspaceProvider('anthropic');
        setSavedWorkspaceProvider('anthropic');
      }
    });
  }, [activeWorkspaceId]);

  // ── Personal key handlers ─────────────────────────────────────────────────

  async function handleSavePersonalKey() {
    const trimmed = personalKey.trim();
    if (!trimmed) { Alert.alert('Error', 'Please enter a valid API key.'); return; }
    setSavingPersonalKey(true);
    try {
      await savePersonalProviderKey(personalProvider, trimmed);
      setSavedPersonalKey(trimmed);
      setSavedPersonalProvider(personalProvider);
      Alert.alert('Saved', `Your personal ${PROVIDER_LABELS[personalProvider]} API key has been saved.`);
    } catch {
      Alert.alert('Error', 'Failed to save key. Please try again.');
    } finally {
      setSavingPersonalKey(false);
    }
  }

  async function handleRemovePersonalKey() {
    Alert.alert('Remove Personal Key', 'AI features will use the workspace key if available.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removePersonalProviderKey();
          setSavedPersonalKey('');
          setPersonalKey('');
          setSavedPersonalProvider('anthropic');
          setPersonalProvider('anthropic');
        },
      },
    ]);
  }

  // ── Workspace key handlers (owner only) ──────────────────────────────────

  async function handleSaveWorkspaceKey() {
    if (!activeWorkspaceId) return;
    const trimmed = workspaceKey.trim();
    if (!trimmed) { Alert.alert('Error', 'Please enter a valid API key.'); return; }
    setSavingWorkspaceKey(true);
    try {
      await saveWorkspaceProviderKey(activeWorkspaceId, workspaceProvider, trimmed);
      setSavedWorkspaceKey(trimmed);
      setSavedWorkspaceProvider(workspaceProvider);
      Alert.alert('Saved', `Team ${PROVIDER_LABELS[workspaceProvider]} API key saved. All workspace members can now use AI features.`);
    } catch {
      Alert.alert('Error', 'Failed to save key. Please try again.');
    } finally {
      setSavingWorkspaceKey(false);
    }
  }

  async function handleRemoveWorkspaceKey() {
    if (!activeWorkspaceId) return;
    Alert.alert(
      'Remove Team Key',
      'Team members without a personal key will lose access to AI features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeWorkspaceProviderKey(activeWorkspaceId);
            setSavedWorkspaceKey('');
            setWorkspaceKey('');
            setSavedWorkspaceProvider('anthropic');
            setWorkspaceProvider('anthropic');
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  }

  function maskKey(key: string): string {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 6) + '•'.repeat(Math.max(0, key.length - 10)) + key.slice(-4);
  }

  const personalKeyIsSaved = savedPersonalKey.length > 0;
  const personalKeyChanged = personalKey.trim() !== savedPersonalKey || personalProvider !== savedPersonalProvider;
  const workspaceKeyIsSaved = savedWorkspaceKey.length > 0;
  const workspaceKeyChanged = workspaceKey.trim() !== savedWorkspaceKey || workspaceProvider !== savedWorkspaceProvider;

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
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
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

        {/* ── AI Assistance ─────────────────────────────────────────────── */}
        <SectionHeader title="AI Assistance" />

        {/* Workspace team key */}
        {activeWorkspace ? (
          <View style={styles.card}>
            <View style={styles.keyBlockBadge}>
              <Text style={styles.keyBlockBadgeText}>
                {isOwner ? 'TEAM KEY · YOU ARE THE OWNER' : 'TEAM KEY · SET BY WORKSPACE OWNER'}
              </Text>
            </View>

            <Text style={styles.aiDesc}>
              {isOwner
                ? `This key is shared with all members of "${activeWorkspace.name}". Members don't need to add their own key when this is set.`
                : `The owner of "${activeWorkspace.name}" manages this key for the whole team. You don't need to do anything if it's already set.`}
            </Text>

            {isOwner ? (
              <>
                <Text style={styles.providerLabel}>AI Provider</Text>
                <ProviderChips value={workspaceProvider} onChange={setWorkspaceProvider} />

                {workspaceKeyIsSaved && !showWorkspaceKey && (
                  <View style={styles.keyStatusActive}>
                    <View style={[styles.keyStatusDot, { backgroundColor: Colors.accent }]} />
                    <Text style={[styles.keyStatusText, { color: Colors.accent }]}>Team key active</Text>
                    <Text style={styles.keyMasked}>{maskKey(savedWorkspaceKey)}</Text>
                  </View>
                )}
                <View style={styles.keyInputRow}>
                  <TextInput
                    style={styles.keyInput}
                    value={workspaceKey}
                    onChangeText={setWorkspaceKey}
                    placeholder={KEY_PLACEHOLDER[workspaceProvider]}
                    placeholderTextColor={Colors.textDim}
                    secureTextEntry={!showWorkspaceKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={styles.showHideBtn} onPress={() => setShowWorkspaceKey(!showWorkspaceKey)}>
                    <Text style={styles.showHideBtnText}>{showWorkspaceKey ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.keyActions}>
                  <TouchableOpacity
                    style={[styles.saveKeyBtn, (!workspaceKeyChanged || savingWorkspaceKey) && styles.saveKeyBtnDisabled]}
                    onPress={handleSaveWorkspaceKey}
                    disabled={!workspaceKeyChanged || savingWorkspaceKey}
                  >
                    <Text style={styles.saveKeyBtnText}>
                      {savingWorkspaceKey ? 'Saving…' : workspaceKeyIsSaved ? 'Update Team Key' : 'Save Team Key'}
                    </Text>
                  </TouchableOpacity>
                  {workspaceKeyIsSaved && (
                    <TouchableOpacity style={styles.removeKeyBtn} onPress={handleRemoveWorkspaceKey}>
                      <Text style={styles.removeKeyBtnText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={workspaceKeyIsSaved ? styles.keyStatusActive : styles.keyStatusMissing}>
                <View style={[styles.keyStatusDot, { backgroundColor: workspaceKeyIsSaved ? Colors.accent : Colors.textDim }]} />
                <Text style={[styles.keyStatusText, { color: workspaceKeyIsSaved ? Colors.accent : Colors.textMuted }]}>
                  {workspaceKeyIsSaved
                    ? `Team key active (${PROVIDER_LABELS[savedWorkspaceProvider]}) — AI features are ready`
                    : 'No team key set — ask your workspace owner to add one'}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Personal key (optional override) */}
        <View style={[styles.card, activeWorkspace ? { marginTop: Spacing.sm } : undefined]}>
          <View style={[styles.keyBlockBadge, { backgroundColor: `${Colors.primary}18` }]}>
            <Text style={[styles.keyBlockBadgeText, { color: Colors.primary }]}>
              {personalKeyIsSaved ? 'YOUR PERSONAL KEY · ACTIVE OVERRIDE' : 'YOUR PERSONAL KEY · OPTIONAL'}
            </Text>
          </View>

          <Text style={styles.aiDesc}>
            {personalKeyIsSaved
              ? `Your personal ${PROVIDER_LABELS[savedPersonalProvider]} key is active. Your AI requests use this key instead of the team key.`
              : isOwner
              ? 'Optionally add your own personal key to use a different AI provider for your own requests.'
              : workspaceKeyIsSaved
              ? 'The team key is already covering you. Add a personal key only if you want to use your own account or a different provider.'
              : 'No team key is set. Add your personal API key to enable AI features.'}
          </Text>

          <Text style={styles.providerLabel}>AI Provider</Text>
          <ProviderChips value={personalProvider} onChange={setPersonalProvider} />

          {personalKeyIsSaved && !showPersonalKey && (
            <View style={styles.keyStatusActive}>
              <View style={styles.keyStatusDot} />
              <Text style={styles.keyStatusText}>Personal key active</Text>
              <Text style={styles.keyMasked}>{maskKey(savedPersonalKey)}</Text>
            </View>
          )}

          <View style={styles.keyInputRow}>
            <TextInput
              style={styles.keyInput}
              value={personalKey}
              onChangeText={setPersonalKey}
              placeholder={KEY_PLACEHOLDER[personalProvider]}
              placeholderTextColor={Colors.textDim}
              secureTextEntry={!showPersonalKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.showHideBtn} onPress={() => setShowPersonalKey(!showPersonalKey)}>
              <Text style={styles.showHideBtnText}>{showPersonalKey ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keyActions}>
            <TouchableOpacity
              style={[styles.saveKeyBtn, (!personalKeyChanged || savingPersonalKey) && styles.saveKeyBtnDisabled]}
              onPress={handleSavePersonalKey}
              disabled={!personalKeyChanged || savingPersonalKey}
            >
              <Text style={styles.saveKeyBtnText}>
                {savingPersonalKey ? 'Saving…' : personalKeyIsSaved ? 'Update Key' : 'Save Key'}
              </Text>
            </TouchableOpacity>
            {personalKeyIsSaved && (
              <TouchableOpacity style={styles.removeKeyBtn} onPress={handleRemovePersonalKey}>
                <Text style={styles.removeKeyBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.apiKeyLink}
            onPress={() => {
              const info = API_KEY_INFO[personalProvider];
              Alert.alert(
                `Get a ${info.label} API Key`,
                `Visit ${info.url} to create an account and generate an API key.`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.apiKeyLinkText}>How do I get a {PROVIDER_LABELS[personalProvider]} API key? →</Text>
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

// ─── Helper components ────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const PROVIDER_OPTIONS: { id: AIProvider; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai',    label: 'OpenAI' },
  { id: 'google',    label: 'Gemini' },
];

function ProviderChips({
  value,
  onChange,
  disabled,
}: {
  value: AIProvider;
  onChange: (p: AIProvider) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.providerChips}>
      {PROVIDER_OPTIONS.map(({ id, label }) => (
        <TouchableOpacity
          key={id}
          onPress={() => !disabled && onChange(id)}
          style={[
            styles.providerChip,
            value === id && styles.providerChipActive,
            disabled && styles.providerChipDisabled,
          ]}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[styles.providerChipText, value === id && styles.providerChipTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingTop: 60, paddingHorizontal: Spacing.lg },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
  displayName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  email: { fontSize: FontSize.sm, color: Colors.textMuted },
  bio: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: Spacing.xs },
  sectionHeader: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textDim,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: Spacing.lg, marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  infoLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  infoValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  keyBlockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.accent}18`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  keyBlockBadgeText: { color: Colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  aiDesc: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },
  providerLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  providerChips: { flexDirection: 'row', gap: Spacing.sm },
  providerChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  providerChipDisabled: { opacity: 0.5 },
  providerChipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  providerChipTextActive: { color: Colors.white },
  keyStatusActive: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: `${Colors.accent}18`, borderRadius: Radius.sm, padding: Spacing.sm,
  },
  keyStatusMissing: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm, padding: Spacing.sm,
  },
  keyStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  keyStatusText: { flex: 1, fontSize: FontSize.xs, fontWeight: '600', color: Colors.accent },
  keyMasked: {
    color: Colors.textDim, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'right',
  },
  keyInputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  keyInput: {
    flex: 1, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.text, fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1, borderColor: Colors.border,
  },
  showHideBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  showHideBtnText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  keyActions: { flexDirection: 'row', gap: Spacing.sm },
  saveKeyBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  saveKeyBtnDisabled: { opacity: 0.4 },
  saveKeyBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  removeKeyBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.danger}22`, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: `${Colors.danger}66`, alignItems: 'center',
  },
  removeKeyBtnText: { color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600' },
  apiKeyLink: { alignItems: 'center', paddingVertical: Spacing.xs },
  apiKeyLinkText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  switchLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '500' },
  switchDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  signOutBtn: {
    backgroundColor: `${Colors.danger}22`, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: `${Colors.danger}55`,
  },
  signOutBtnText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '700' },
  version: { color: Colors.textDim, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xl },
});
