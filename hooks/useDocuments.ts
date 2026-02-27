import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { createEmptyContent, serializeDocumentContent } from '@/lib/documents/schemas';
import type { Document, DocumentType, Approval, ApproverEntry, Notification } from '@/types';

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

      return { id: ref.id, ...docData } as unknown as Document;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents', doc.workspaceId] });
    },
  });
}

// ─── Update document ──────────────────────────────────────────────────────────

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
      name,
    }: {
      id: string;
      content?: string;
      name?: string;
    }) => {
      const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (content !== undefined) updates.content = content;
      if (name !== undefined) updates.name = name;

      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, id), updates);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });
}

// ─── Delete document ──────────────────────────────────────────────────────────

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, id));
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
