import { create } from 'zustand';

type EditorMode = 'view' | 'edit' | 'dictate' | 'ai-assist';

interface UIState {
  // Workspace / channel navigation
  activeWorkspaceId: string | null;
  activeChannelId: string | null;

  // Document editor
  editorMode: EditorMode;
  isDictating: boolean;
  dictationTranscript: string;

  // Modal visibility
  approvalModalVisible: boolean;
  newDocumentModalVisible: boolean;
  newChannelModalVisible: boolean;
  aiAssistModalVisible: boolean;

  // Actions
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

export const useUIStore = create<UIState>()((set) => ({
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
}));
