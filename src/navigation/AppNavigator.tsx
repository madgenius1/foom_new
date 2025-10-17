import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { authInstance } from '../api/firebase';
import { useAuthStore } from '../store/useAuthStore';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ManageAppsScreen from '../screens/ManageAppsScreen';
import WalletScreen from '../screens/WalletScreen';
import InvestScreen from '../screens/InvestScreen';
import WithdrawScreen from '../screens/WithdrawScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  ManageApps: undefined;
  Wallet: undefined;
  Invest: undefined;
  Withdraw: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    const subscriber = authInstance.onAuthStateChanged(async (user) => {
      if (user) {
        await loadUser(user.uid);
      }
      if (initializing) setInitializing(false);
    });

    return subscriber;
  }, []);

  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ManageApps" component={ManageAppsScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Invest" component={InvestScreen} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;