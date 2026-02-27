import { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { useCreateWorkspace } from '@/hooks/useWorkspace';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface CreateWorkspaceSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (workspaceId: string) => void;
}

export function CreateWorkspaceSheet({
  visible,
  onClose,
  onCreated,
}: CreateWorkspaceSheetProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createWorkspace = useCreateWorkspace();

  function handleCreate() {
    if (!name.trim()) return;
    createWorkspace.mutate(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: (workspaceId) => {
          setName('');
          setDescription('');
          onClose();
          onCreated?.(workspaceId);
        },
        onError: () =>
          Alert.alert('Error', 'Could not create workspace. Please try again.'),
      }
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Create Workspace</Text>
          <Text style={styles.subtitle}>
            A workspace is a shared space for your team or organisation.
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Workspace name (e.g. Acme Corp)"
            placeholderTextColor={Colors.textDim}
            autoFocus
            maxLength={60}
            returnKeyType="next"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description (optional)"
            placeholderTextColor={Colors.textDim}
            multiline
            maxLength={200}
            returnKeyType="done"
          />

          <Button
            label="Create Workspace"
            onPress={handleCreate}
            loading={createWorkspace.isPending}
            disabled={!name.trim()}
            fullWidth
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
