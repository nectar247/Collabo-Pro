import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { Workspace, WorkspaceMember } from '@/types';

export function useWorkspaces() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['workspaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch workspaces owned by user
      const ownedQ = query(
        collection(db, COLLECTIONS.WORKSPACES),
        where('ownerId', '==', user.id)
      );
      // Fetch workspaces where user is a member (stored as flat memberIds array)
      const memberQ = query(
        collection(db, COLLECTIONS.WORKSPACES),
        where('memberIds', 'array-contains', user.id)
      );

      const [ownedSnap, memberSnap] = await Promise.all([
        getDocs(ownedQ),
        getDocs(memberQ),
      ]);

      const seen = new Set<string>();
      const workspaces: Workspace[] = [];

      for (const d of [...ownedSnap.docs, ...memberSnap.docs]) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          workspaces.push({ id: d.id, ...d.data() } as Workspace);
        }
      }

      return workspaces;
    },
    enabled: !!user?.id,
  });
}

export function useWorkspace(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const snap = await getDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Workspace) : null;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setActiveWorkspace = useUIStore((s) => s.setActiveWorkspace);

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const member: WorkspaceMember = {
        userId: user.id,
        role: 'owner',
        joinedAt: serverTimestamp() as WorkspaceMember['joinedAt'],
      };

      const workspaceData = {
        name,
        description: description ?? '',
        ownerId: user.id,
        members: [member],
        memberIds: [user.id],  // flat array for Firestore array-contains queries
        createdAt: serverTimestamp(),
      };

      const workspaceRef = await addDoc(
        collection(db, COLLECTIONS.WORKSPACES),
        workspaceData
      );

      // Auto-create a #general channel
      await addDoc(collection(db, COLLECTIONS.CHANNELS), {
        workspaceId: workspaceRef.id,
        name: 'general',
        type: 'public',
        members: [user.id],
        createdAt: serverTimestamp(),
      });

      // Update user's workspaces array
      await updateDoc(doc(db, COLLECTIONS.USERS, user.id), {
        workspaces: arrayUnion(workspaceRef.id),
      });

      return workspaceRef.id;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?.id] });
      setActiveWorkspace(workspaceId);
    },
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const snap = await getDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId));
      if (!snap.exists()) return [];
      const workspace = snap.data() as Workspace;
      return workspace.members ?? [];
    },
    enabled: !!workspaceId,
  });
}
