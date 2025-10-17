import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type OnboardingNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<OnboardingNavigationProp>();
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      icon: 'lock-outline',
      title: 'Lock Distracting Apps',
      description:
        'Choose which apps distract you and lock them. Unlock them only when needed by spending tokens.',
    },
    {
      icon: 'trophy-outline',
      title: 'Earn Tokens for Focus',
      description:
        'The more you use your phone productively, the more tokens you earn. Track your progress daily.',
    },
    {
      icon: 'chart-line',
      title: 'Invest & Grow',
      description:
        'Use your tokens to invest in Money Market Funds. Watch your money grow while building better habits.',
    },
    {
      icon: 'shield-check-outline',
      title: 'Privacy & Permissions',
      description:
        'FOOM needs Usage Access and Accessibility permissions to track your app usage and help you stay focused. Your data stays private and is only used to calculate your rewards.',
    },
  ];

  const isLastPage = currentPage === pages.length - 1;

  const handleNext = () => {
    if (isLastPage) {
      navigation.replace('Login');
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const currentPageData = pages[currentPage];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            name={currentPageData.icon}
            size={120}
            color={theme.colors.primary}
          />
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          {currentPageData.title}
        </Text>

        <Text variant="bodyLarge" style={styles.description}>
          {currentPageData.description}
        </Text>

        <View style={styles.pagination}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentPage
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!isLastPage && (
          <Button mode="text" onPress={handleSkip}>
            Skip
          </Button>
        )}
        <Button mode="contained" onPress={handleNext} style={styles.nextButton}>
          {isLastPage ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  nextButton: {
    flex: 1,
    marginLeft: 16,
  },
});

export default OnboardingScreen;