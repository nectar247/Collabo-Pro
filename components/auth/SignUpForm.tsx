import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export function SignUpForm() {
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = 'Name must be at least 2 characters';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    clearError();
    if (!validate()) return;
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch {
      // Error is set in the store
    }
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Full Name"
        value={displayName}
        onChangeText={(t) => { setDisplayName(t); setFieldErrors((e) => ({ ...e, displayName: undefined })); }}
        autoCapitalize="words"
        placeholder="Your full name"
        error={fieldErrors.displayName}
        returnKeyType="next"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={(t) => { setEmail(t); setFieldErrors((e) => ({ ...e, email: undefined })); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        placeholder="you@example.com"
        error={fieldErrors.email}
        returnKeyType="next"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={(t) => { setPassword(t); setFieldErrors((e) => ({ ...e, password: undefined })); }}
        isPassword
        placeholder="Min. 8 characters"
        error={fieldErrors.password}
        returnKeyType="next"
      />

      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(t) => { setConfirmPassword(t); setFieldErrors((e) => ({ ...e, confirmPassword: undefined })); }}
        isPassword
        placeholder="Repeat your password"
        error={fieldErrors.confirmPassword}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <Button
        label="Create Account"
        onPress={handleSubmit}
        loading={isLoading}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorBanner: {
    backgroundColor: `${Colors.danger}22`,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
