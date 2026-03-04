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
  Timestamp,
  arrayUnion,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { Workspace, WorkspaceMember, User } from '@/types';

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
      console.log('[createWorkspace] user:', JSON.stringify(user));
      if (!user) throw new Error('Not authenticated');

      const member: WorkspaceMember = {
        userId: user.id,
        role: 'owner',
        joinedAt: Timestamp.now(),
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

export function useRenameWorkspace() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ workspaceId, name }: { workspaceId: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Workspace name cannot be empty.');
      await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), { name: trimmed });
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?.id] });
    },
  });
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      email,
    }: {
      workspaceId: string;
      email: string;
    }) => {
      // Look up user by email
      const usersSnap = await getDocs(
        query(collection(db, COLLECTIONS.USERS), where('email', '==', email.toLowerCase().trim()))
      );
      if (usersSnap.empty) {
        throw new Error('No account found with that email address.');
      }
      const targetUser = { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() } as User;

      // Check not already a member
      const wsSnap = await getDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId));
      if (!wsSnap.exists()) throw new Error('Workspace not found.');
      const ws = wsSnap.data() as Workspace;
      if ((ws.members ?? []).some((m) => m.userId === targetUser.id)) {
        throw new Error('This person is already a member of the workspace.');
      }

      // Add to workspace
      const newMember: WorkspaceMember = {
        userId: targetUser.id,
        role: 'member',
        joinedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, COLLECTIONS.WORKSPACES, workspaceId), {
        memberIds: arrayUnion(targetUser.id),
        members: arrayUnion(newMember),
      });

      // Also add to #general channel if it exists
      const channelSnap = await getDocs(
        query(
          collection(db, COLLECTIONS.CHANNELS),
          where('workspaceId', '==', workspaceId),
          where('name', '==', 'general')
        )
      );
      if (!channelSnap.empty) {
        await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelSnap.docs[0].id), {
          members: arrayUnion(targetUser.id),
        });
      }

      return targetUser;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });
}
