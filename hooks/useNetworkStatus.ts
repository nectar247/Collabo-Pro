/**
 * useNetworkStatus — polls connectivity every 8 seconds using a HEAD request
 * to Google's generate_204 endpoint. No additional packages needed.
 *
 * Returns { isConnected: boolean }.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const CHECK_URL = 'https://www.gstatic.com/generate_204';
const POLL_INTERVAL_MS = 8_000;
const TIMEOUT_MS = 4_000;

async function checkOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(CHECK_URL, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      setIsConnected(await checkOnline());
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    // Immediate check on mount
    checkOnline().then(setIsConnected);
    startPolling();

    // Re-check immediately when the app comes to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkOnline().then(setIsConnected);
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, []);

  return { isConnected };
}
