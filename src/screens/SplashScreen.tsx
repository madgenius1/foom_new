import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace('Dashboard');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Text variant="displayLarge" style={styles.title}>
        FOOM
      </Text>
      <Text variant="titleMedium" style={styles.subtitle}>
        Focus on Opportunity & Money
      </Text>
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loader: {
    marginTop: 32,
  },
});

export default SplashScreen;