import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@collabo_write_queue';

interface QueueEntry {
  docId: string;
  content: string;
  queuedAt: number;
}

async function readQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(entries: QueueEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // non-critical
  }
}

/**
 * Enqueue or replace the pending content for a docId.
 * Only the latest content per document is kept (last-write-wins).
 */
export async function enqueueWrite(docId: string, content: string): Promise<void> {
  const queue = await readQueue();
  const filtered = queue.filter((e) => e.docId !== docId);
  filtered.push({ docId, content, queuedAt: Date.now() });
  await writeQueue(filtered);
}

/** Returns the number of documents with pending writes. */
export async function getQueuedCount(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Process all queued writes by calling saveFn for each entry.
 * Only removes entries that succeed — failed entries are retained for retry.
 */
export async function flushQueue(
  saveFn: (docId: string, content: string) => Promise<void>
): Promise<void> {
  const queue = await readQueue();
  if (!queue.length) return;

  const results = await Promise.allSettled(
    queue.map((e) => saveFn(e.docId, e.content).then(() => e.docId))
  );

  const succeededIds = new Set(
    results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value)
  );
  const remaining = queue.filter((e) => !succeededIds.has(e.docId));
  await writeQueue(remaining);
}
