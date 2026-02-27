import { Timestamp } from 'firebase/firestore';

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DocumentCollaborator {
  userId: string;
  permission: 'view' | 'comment' | 'edit';
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

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'mention' | 'approval_request' | 'approval_response' | 'document_shared';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Timestamp;
}
