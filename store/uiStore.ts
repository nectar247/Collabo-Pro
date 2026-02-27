import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type EditorMode = 'view' | 'edit' | 'dictate' | 'ai-assist';

interface UIState {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;

  editorMode: EditorMode;
  isDictating: boolean;
  dictationTranscript: string;

  approvalModalVisible: boolean;
  newDocumentModalVisible: boolean;
  newChannelModalVisible: boolean;
  aiAssistModalVisible: boolean;

  setActiveWorkspace: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  setEditorMode: (mode: EditorMode) => void;
  setDictating: (value: boolean) => void;
  appendDictationTranscript: (chunk: string) => void;
  clearDictationTranscript: () => void;
  toggleApprovalModal: () => void;
  toggleNewDocumentModal: () => void;
  toggleNewChannelModal: () => void;
  toggleAIAssistModal: () => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeChannelId: null,

      editorMode: 'edit',
      isDictating: false,
      dictationTranscript: '',

      approvalModalVisible: false,
      newDocumentModalVisible: false,
      newChannelModalVisible: false,
      aiAssistModalVisible: false,

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setActiveChannel: (id) => set({ activeChannelId: id }),
      setEditorMode: (mode) => set({ editorMode: mode }),
      setDictating: (value) => set({ isDictating: value }),
      appendDictationTranscript: (chunk) =>
        set((s) => ({ dictationTranscript: s.dictationTranscript + chunk })),
      clearDictationTranscript: () => set({ dictationTranscript: '' }),

      toggleApprovalModal: () =>
        set((s) => ({ approvalModalVisible: !s.approvalModalVisible })),
      toggleNewDocumentModal: () =>
        set((s) => ({ newDocumentModalVisible: !s.newDocumentModalVisible })),
      toggleNewChannelModal: () =>
        set((s) => ({ newChannelModalVisible: !s.newChannelModalVisible })),
      toggleAIAssistModal: () =>
        set((s) => ({ aiAssistModalVisible: !s.aiAssistModalVisible })),
      closeAllModals: () =>
        set({
          approvalModalVisible: false,
          newDocumentModalVisible: false,
          newChannelModalVisible: false,
          aiAssistModalVisible: false,
        }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist workspace selection — survives app restarts
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
);
