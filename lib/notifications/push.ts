/**
 * Push notification helpers.
 *
 * Dual-layer delivery:
 *   1. Firestore `notifications` doc  → picked up by useNotifications() in-app.
 *   2. Expo Push API                  → wakes the app even when in background.
 *
 * sendNotification() does both atomically so callers only need one call.
 */

import { addDoc, collection, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { Notification } from '@/types';

// ─── Expo push delivery ───────────────────────────────────────────────────────

/** Fetch recipient's Expo push token and deliver a push notification. */
async function sendPushToUser(
  recipientId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, recipientId));
    const pushToken: string | undefined = snap.data()?.pushToken;
    if (!pushToken?.startsWith('ExponentPushToken')) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
      }),
    });
  } catch {
    // Non-critical — in-app notification still works
  }
}

// ─── Cooldown map — avoid spam from rapid auto-saves ─────────────────────────

const lastNotified = new Map<string, number>(); // key: `${type}:${docId}:${recipientId}`
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isCooledDown(key: string): boolean {
  const last = lastNotified.get(key) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  lastNotified.set(key, Date.now());
  return true;
}

// ─── Combined helper ──────────────────────────────────────────────────────────

export interface SendNotificationParams {
  recipientId: string;
  type: Notification['type'];
  title: string;
  body: string;
  data?: Record<string, string>;
  /** If provided, duplicate notifications of the same type on this doc are
   *  suppressed for 5 minutes (prevents auto-save spam). */
  dedupKey?: string;
}

/**
 * Write a Firestore notification doc (for in-app bell) AND send an Expo push
 * to the recipient's device. Safe to call from any hook — errors are swallowed.
 */
export async function sendNotification({
  recipientId,
  type,
  title,
  body,
  data,
  dedupKey,
}: SendNotificationParams): Promise<void> {
  try {
    // Cooldown check (optional)
    if (dedupKey) {
      const key = `${type}:${dedupKey}:${recipientId}`;
      if (!isCooledDown(key)) return;
    }

    // 1. Write in-app notification to Firestore
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      userId: recipientId,
      type,
      title,
      body,
      data: data ?? {},
      read: false,
      createdAt: serverTimestamp(),
    });

    // 2. Send push (best-effort, async — don't await to avoid blocking callers)
    sendPushToUser(recipientId, title, body, data).catch(() => {});
  } catch {
    // Never propagate notification errors to the caller
  }
}
