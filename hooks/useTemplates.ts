import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import type { DocumentType } from '@/types';
import type { DocumentTemplate } from '@/lib/documents/templates';

export interface FirestoreTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: DocumentType;
  content: string;      // serialized DocumentContent JSON
  workspaceId: string;
  createdBy: string;
  createdAt: unknown;
}

/** Fetch all user-saved templates for the active workspace */
export function useWorkspaceTemplates(workspaceId: string | null) {
  return useQuery({
    queryKey: ['templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as FirestoreTemplate[];
      const q = query(
        collection(db, COLLECTIONS.TEMPLATES),
        where('workspaceId', '==', workspaceId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreTemplate));
    },
    enabled: !!workspaceId,
  });
}

/** Convert a FirestoreTemplate into the DocumentTemplate shape used by the picker */
export function firestoreToDocumentTemplate(t: FirestoreTemplate): DocumentTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    type: t.type,
    getContent: () => t.content,
  };
}

/** Save the current document's content as a reusable template in Firestore */
export function useSaveAsTemplate() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      name,
      description,
      icon,
      type,
      content,
      workspaceId,
    }: {
      name: string;
      description: string;
      icon: string;
      type: DocumentType;
      content: string;
      workspaceId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const ref = await addDoc(collection(db, COLLECTIONS.TEMPLATES), {
        name,
        description,
        icon,
        type,
        content,
        workspaceId,
        createdBy: user.id,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id, workspaceId };
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['templates', workspaceId] });
    },
  });
}

/** Delete a user-saved template */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, workspaceId }: { templateId: string; workspaceId: string }) => {
      await deleteDoc(doc(db, COLLECTIONS.TEMPLATES, templateId));
      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['templates', workspaceId] });
    },
  });
}
