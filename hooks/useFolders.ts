import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import type { Folder } from '@/types';

export function useFolders(workspaceId: string | null) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) { setFolders([]); setIsLoading(false); return; }
    const q = query(
      collection(db, COLLECTIONS.FOLDERS),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setFolders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Folder)));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return unsub;
  }, [workspaceId]);

  return { data: folders, isLoading };
}

export function useCreateFolder() {
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async ({ name, workspaceId }: { name: string; workspaceId: string }) => {
      await addDoc(collection(db, COLLECTIONS.FOLDERS), {
        name: name.trim(),
        workspaceId,
        ownerId: user?.id ?? '',
        createdAt: serverTimestamp(),
      });
    },
  });
}

export function useDeleteFolder() {
  return useMutation({
    mutationFn: async (folderId: string) => {
      await deleteDoc(doc(db, COLLECTIONS.FOLDERS, folderId));
    },
  });
}

export function useMoveDocumentToFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, folderId, workspaceId }: { docId: string; folderId: string | null; workspaceId: string }) => {
      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, docId), { folderId: folderId ?? null });
      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    },
  });
}
