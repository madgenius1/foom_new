import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type LoginNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<LoginNavigationProp>();
  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      await signIn(email, password);
    } catch (err) {
      // Error is handled by store
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error is handled by store
    }
  };

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
            Welcome Back
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign in to continue
          </Text>
        </View>

        <View style={styles.form}>
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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || !email || !password}
            style={styles.button}
          >
            Sign In
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={handleGoogleSignIn}
            loading={isLoading}
            disabled={isLoading}
            icon={() => <Icon name="google" size={20} />}
            style={styles.button}
          >
            Sign in with Google
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Signup')}
            disabled={isLoading}
            style={styles.linkButton}
          >
            Don't have an account? Sign Up
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
  divider: {
    marginVertical: 16,
  },
  linkButton: {
    marginTop: 8,
  },
});

export default LoginScreen;