import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { sendNotification } from '@/lib/notifications/push';
import { useAuthStore } from '@/store/authStore';
import { createEmptyContent, serializeDocumentContent } from '@/lib/documents/schemas';
import { logActivity } from '@/hooks/useActivityLog';
import type { Document, DocumentType, DocumentVersion, DocumentCollaborator, Approval, ApproverEntry, Notification } from '@/types';

// ─── AsyncStorage document cache ─────────────────────────────────────────────

const DOC_CACHE_KEY = (id: string) => `@collabo_doc_${id}`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function persistDocument(document: Document): Promise<void> {
  try {
    await AsyncStorage.setItem(
      DOC_CACHE_KEY(document.id),
      JSON.stringify({ document, cachedAt: Date.now() }),
    );
  } catch { /* non-critical */ }
}

async function loadCachedDocument(docId: string): Promise<Document | null> {
  try {
    const raw = await AsyncStorage.getItem(DOC_CACHE_KEY(docId));
    if (!raw) return null;
    const { document, cachedAt } = JSON.parse(raw) as { document: Document; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return document;
  } catch {
    return null;
  }
}

// ─── Document list ────────────────────────────────────────────────────────────

export function useDocuments(workspaceId: string | null) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];
      const q = query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where('workspaceId', '==', workspaceId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Document));
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const snap = await getDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Document) : null;
    },
    enabled: !!documentId,
  });
}

// ─── Real-time document (onSnapshot + AsyncStorage offline cache) ─────────────

export function useRealtimeDocument(docId: string | null) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (!docId) { setIsLoading(false); return; }

    // 1. Load from cache immediately so the UI shows something while we connect
    loadCachedDocument(docId).then((cached) => {
      if (cached) {
        setDocument(cached);
        setIsCached(true);
        setIsLoading(false);
      }
    });

    // 2. Subscribe to live Firestore updates
    const ref = doc(db, COLLECTIONS.DOCUMENTS, docId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const fresh = { id: snap.id, ...snap.data() } as Document;
          setDocument(fresh);
          setIsCached(false);
          persistDocument(fresh); // keep cache up-to-date
        } else {
          setDocument(null);
        }
        setIsLoading(false);
      },
      () => {
        // onSnapshot error (e.g. offline after cache miss) — keep whatever we have
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [docId]);

  return { data: document, isLoading, isCached };
}

// ─── Create document ──────────────────────────────────────────────────────────

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      name,
      type,
      workspaceId,
      initialContent,
    }: {
      name: string;
      type: DocumentType;
      workspaceId: string;
      initialContent?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const content = initialContent ?? serializeDocumentContent(createEmptyContent(type));

      const docData = {
        workspaceId,
        name,
        type,
        content,
        ownerId: user.id,
        collaborators: [],
        status: 'draft',
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), docData);

      // Save initial version
      await addDoc(
        collection(db, COLLECTIONS.DOCUMENTS, ref.id, COLLECTIONS.DOCUMENT_VERSIONS),
        { content, version: 1, savedAt: serverTimestamp(), savedBy: user.id }
      );

      logActivity({
        workspaceId, userId: user.id, userDisplayName: user.displayName,
        action: 'document_created', resourceType: 'document', resourceId: ref.id, resourceName: name,
      }).catch(() => {});

      return { id: ref.id, workspaceId, name, type, content, ownerId: user.id, collaborators: [], status: 'draft', version: 1 } as unknown as Document;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents', doc.workspaceId] });
    },
  });
}

// ─── Update document ──────────────────────────────────────────────────────────

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      id,
      content,
      name,
      workspaceId,
    }: {
      id: string;
      content?: string;
      name?: string;
      workspaceId?: string;
    }) => {
      const docRef = doc(db, COLLECTIONS.DOCUMENTS, id);
      const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (content !== undefined) updates.content = content;
      if (name !== undefined) updates.name = name;

      // Increment version counter when saving content
      let newVersion: number | undefined;
      let ownerId: string | undefined;
      let docName: string | undefined;
      if (content !== undefined) {
        const snap = await getDoc(docRef);
        const data = snap.data();
        newVersion = (data?.version ?? 0) + 1;
        ownerId = data?.ownerId as string | undefined;
        docName = data?.name as string | undefined;
        updates.version = newVersion;
      }

      await updateDoc(docRef, updates);

      // Save version snapshot on every content auto-save
      if (content !== undefined && newVersion !== undefined && user) {
        await addDoc(
          collection(db, COLLECTIONS.DOCUMENTS, id, COLLECTIONS.DOCUMENT_VERSIONS),
          {
            content,
            version: newVersion,
            savedAt: serverTimestamp(),
            savedBy: user.id,
            savedByName: user.displayName,
            label: 'auto-save',
          }
        );

        // Notify document owner when a *collaborator* (not the owner) saves
        if (ownerId && ownerId !== user.id && docName) {
          sendNotification({
            recipientId: ownerId,
            type: 'document_edited',
            title: `✏️ "${docName}" was edited`,
            body: `${user.displayName} made changes to your document.`,
            data: { documentId: id },
            dedupKey: id, // 5-minute cooldown — prevents auto-save flooding
          }).catch(() => {});
        }
      }

      // Log rename (not content auto-saves)
      if (name !== undefined && workspaceId && user) {
        logActivity({
          workspaceId, userId: user.id, userDisplayName: user.displayName,
          action: 'document_renamed', resourceType: 'document', resourceId: id, resourceName: name,
        }).catch(() => {});
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });
}

// ─── Conflict draft + version history ────────────────────────────────────────

/** Saves the user's local content as a conflict-draft when remote overwrites it */
export function useSaveConflictDraft() {
  const user = useAuthStore((s) => s.user);
  return async (docId: string, content: string) => {
    if (!user) return;
    const snap = await getDoc(doc(db, COLLECTIONS.DOCUMENTS, docId));
    const currentVersion = snap.data()?.version ?? 0;
    await addDoc(
      collection(db, COLLECTIONS.DOCUMENTS, docId, COLLECTIONS.DOCUMENT_VERSIONS),
      {
        content,
        version: currentVersion,
        savedAt: serverTimestamp(),
        savedBy: user.id,
        savedByName: user.displayName,
        label: 'conflict-draft',
      }
    );
  };
}

/** Fetches the last 50 versions of a document, newest first */
export function useDocumentVersions(docId: string | null) {
  return useQuery({
    queryKey: ['document-versions', docId],
    queryFn: async () => {
      if (!docId) return [];
      const q = query(
        collection(db, COLLECTIONS.DOCUMENTS, docId, COLLECTIONS.DOCUMENT_VERSIONS),
        orderBy('savedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DocumentVersion[];
    },
    enabled: !!docId,
  });
}

// ─── Collaborator permissions ─────────────────────────────────────────────────

export function useUpdateDocumentCollaborators() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      docId,
      collaborators,
    }: {
      docId: string;
      collaborators: DocumentCollaborator[];
    }) => {
      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, docId), { collaborators });
    },
    onSuccess: (_, { docId }) => {
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
    },
  });
}

// ─── Delete document ──────────────────────────────────────────────────────────

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      name,
    }: {
      id: string;
      workspaceId: string;
      name?: string;
    }) => {
      await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, id));

      if (user && name) {
        logActivity({
          workspaceId, userId: user.id, userDisplayName: user.displayName,
          action: 'document_deleted', resourceType: 'document', resourceId: id, resourceName: name,
        }).catch(() => {});
      }

      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
  });
}

// ─── Approval workflow ────────────────────────────────────────────────────────

export function useApprovals(documentId: string | null) {
  return useQuery({
    queryKey: ['approvals', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const q = query(
        collection(db, COLLECTIONS.APPROVALS),
        where('documentId', '==', documentId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Approval));
    },
    enabled: !!documentId,
  });
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      documentId,
      workspaceId,
      approverIds,
      message,
    }: {
      documentId: string;
      workspaceId: string;
      approverIds: string[];
      message?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Update document status to 'review'
      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId), {
        status: 'review',
        updatedAt: serverTimestamp(),
      });

      // Create approval record
      const approvers: Omit<ApproverEntry, 'respondedAt'>[] = approverIds.map((id) => ({
        userId: id,
        status: 'pending',
      }));

      const approvalRef = await addDoc(collection(db, COLLECTIONS.APPROVALS), {
        documentId,
        workspaceId,
        requestedBy: user.id,
        requestedAt: serverTimestamp(),
        approvers,
        message: message ?? '',
        status: 'pending',
      });

      // Notify each approver
      await Promise.all(
        approverIds.map((approverId) => {
          const notification: Omit<Notification, 'id'> = {
            userId: approverId,
            type: 'approval_request',
            title: 'Approval Requested',
            body: `${user.displayName} is requesting your approval on a document.`,
            data: { documentId, approvalId: approvalRef.id },
            read: false,
            createdAt: serverTimestamp() as Notification['createdAt'],
          };
          return addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notification);
        })
      );

      return approvalRef.id;
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });
}

export function useRespondToApproval() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      approvalId,
      documentId,
      status,
      comment,
    }: {
      approvalId: string;
      documentId: string;
      status: 'approved' | 'rejected';
      comment?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch current approval
      const approvalSnap = await getDoc(doc(db, COLLECTIONS.APPROVALS, approvalId));
      if (!approvalSnap.exists()) throw new Error('Approval not found');

      const approval = approvalSnap.data() as Approval;
      const updatedApprovers = approval.approvers.map((a) =>
        a.userId === user.id
          ? { ...a, status, comment: comment ?? '', respondedAt: serverTimestamp() }
          : a
      );

      const allResponded = updatedApprovers.every((a) => a.status !== 'pending');
      const anyRejected = updatedApprovers.some((a) => a.status === 'rejected');
      const overallStatus = allResponded ? (anyRejected ? 'rejected' : 'approved') : 'pending';

      await updateDoc(doc(db, COLLECTIONS.APPROVALS, approvalId), {
        approvers: updatedApprovers,
        status: overallStatus,
      });

      // Update document status if all responded
      if (allResponded) {
        await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId), {
          status: overallStatus === 'approved' ? 'approved' : 'draft',
          updatedAt: serverTimestamp(),
        });
      }
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });
}
