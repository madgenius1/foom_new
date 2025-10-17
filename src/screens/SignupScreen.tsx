import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type SignupNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<SignupNavigationProp>();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      // Show error
      return;
    }

    try {
      await signUp(email, password, name, phone);
    } catch (err) {
      // Error is handled by store
    }
  };

  const isFormValid = name && email && password && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Join FOOM today
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Phone (Optional)"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            autoComplete="tel"
            left={<TextInput.Icon icon="phone-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock-check-outline" />}
            error={confirmPassword.length > 0 && password !== confirmPassword}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={isLoading}
            disabled={isLoading || !isFormValid}
            style={styles.button}
          >
            Sign Up
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
            style={styles.linkButton}
          >
            Already have an account? Sign In
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 8,
  },
  linkButton: {
    marginTop: 8,
  },
});

export default SignupScreen;