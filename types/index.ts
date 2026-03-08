import { Timestamp } from 'firebase/firestore';

// ─── AI Provider ─────────────────────────────────────────────────────────────
export type AIProvider = 'anthropic' | 'openai' | 'google';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
}

// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  workspaces: string[];
  createdAt: Timestamp;
}

// ─── Workspace ───────────────────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  iconURL?: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: Timestamp;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: Timestamp;
}

// ─── Channels / Chat ─────────────────────────────────────────────────────────
export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  members: string[];        // userIds
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;      // Stored at send time for display
  content: string;          // Encrypted ciphertext
  attachments?: Attachment[];
  reactions?: Record<string, string[]>;  // emoji -> userIds
  editedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Attachment {
  type: 'image' | 'file' | 'document';
  url: string;
  name: string;
  size: number;
}

// ─── Documents ───────────────────────────────────────────────────────────────
export type DocumentType = 'text' | 'spreadsheet' | 'presentation';

export interface Document {
  id: string;
  workspaceId: string;
  name: string;
  type: DocumentType;
  content: string;           // JSON stringified document content
  ownerId: string;
  collaborators: DocumentCollaborator[];
  status: 'draft' | 'review' | 'approved' | 'archived';
  version: number;
  folderId?: string;         // optional folder the document belongs to
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Folders ─────────────────────────────────────────────────────────────────
export interface Folder {
  id: string;
  workspaceId: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface DocumentCollaborator {
  userId: string;
  permission: 'view' | 'comment' | 'edit';
}

// ─── Real-time Collaboration ─────────────────────────────────────────────────
export interface DocumentPresenceEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  color: string;       // deterministic hex from palette
  lastSeen: Timestamp;
  blockId?: string | null;  // which block/cell this user is currently editing
}

export interface DocumentVersion {
  id: string;
  content: string;     // JSON stringified document content
  version: number;
  savedAt: Timestamp;
  savedBy: string;     // userId
  savedByName: string; // display name at save time
  label: 'initial' | 'auto-save' | 'conflict-draft' | 'manual';
}

// ─── Workflow / Approvals ─────────────────────────────────────────────────────
export interface Approval {
  id: string;
  documentId: string;
  workspaceId: string;
  requestedBy: string;
  requestedAt: Timestamp;
  approvers: ApproverEntry[];
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface ApproverEntry {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  respondedAt?: Timestamp;
}

// ─── Activity Log ────────────────────────────────────────────────────────────
export type ActivityAction =
  | 'document_created'
  | 'document_renamed'
  | 'document_deleted'
  | 'document_shared'
  | 'channel_created';

export interface ActivityLogEntry {
  id: string;
  workspaceId: string;
  userId: string;
  userDisplayName: string;
  action: ActivityAction;
  resourceType: 'document' | 'channel';
  resourceId: string;
  resourceName: string;
  timestamp: Timestamp;
}

// ─── Comments ────────────────────────────────────────────────────────────────
export interface CommentReply {
  id: string;
  userId: string;
  userDisplayName: string;
  text: string;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  documentId: string;
  workspaceId: string;
  userId: string;
  userDisplayName: string;
  text: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  replies: CommentReply[];
  createdAt: Timestamp;
  anchorBlockId?: string;
  anchorText?: string;
  anchorStart?: number;   // char position start within block.text
  anchorEnd?: number;     // char position end within block.text
}

// ─── Track Changes / Suggested Edits ─────────────────────────────────────────
export interface DocumentSuggestion {
  id: string;
  documentId: string;
  workspaceId: string;
  blockId: string;
  originalText: string;
  suggestedText: string;
  userId: string;
  userDisplayName: string;
  createdAt: Timestamp;
  status: 'pending' | 'accepted' | 'rejected';
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type:
    | 'message'
    | 'mention'
    | 'approval_request'
    | 'approval_response'
    | 'document_shared'
    | 'document_edited'
    | 'comment_added';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Timestamp;
}
