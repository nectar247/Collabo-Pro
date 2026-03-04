import { Redirect } from 'expo-router';

// This gives Expo Router a concrete initial route to render.
// The LoadingScreen overlay in _layout.tsx hides this transition;
// AuthGuard then redirects to /(tabs) once auth resolves if signed in.
export default function RootIndex() {
  return <Redirect href="/(auth)" />;
}
