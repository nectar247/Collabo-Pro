import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="channel/[id]" />
          <Stack.Screen name="document/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workspace-log" />
        </Stack>
        {/* LoadingScreen rendered as an overlay so the Stack is always mounted.
            Conditionally unmounting the Stack caused Expo Router to show a
            blank screen while it re-initialised the navigation state. */}
        {isLoading && (
          <View style={StyleSheet.absoluteFill}>
            <LoadingScreen />
          </View>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
