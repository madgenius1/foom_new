import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
    Text,
    Card,
    Button,
    IconButton,
    useTheme,
    Appbar,
    FAB,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useWalletStore } from '../store/useWalletStore';
import { useThemeStore } from '../store/useThemeStore';
import { RewardsService } from '../services/rewardsService';
import { BlockerService } from '../services/blockerService';
import UsageService from '../services/usageService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = () => {
    const theme = useTheme();
    const navigation = useNavigation<DashboardNavigationProp>();
    const { user, signOut } = useAuthStore();
    const { balance, transactions, setBalance, setTransactions } = useWalletStore();
    const { toggleTheme, isDark } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [hasUsagePermission, setHasUsagePermission] = useState(false);
    const [hasAccessibilityPermission, setHasAccessibilityPermission] = useState(false);

    useEffect(() => {
        loadDashboardData();
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        const usagePerm = await UsageService.hasPermission();
        const accessPerm = await BlockerService.hasAccessibilityPermission();
        setHasUsagePermission(usagePerm);
        setHasAccessibilityPermission(accessPerm);
    };

    const loadDashboardData = async () => {
        if (!user) return;

        try {
            // Load user's latest data
            const userData = await useAuthStore.getState().loadUser(user.uid);

            // Update balance from Firestore
            if (userData) {
                setBalance(userData.tokensBalance || 0);
            }

            // Load recent transactions
            const recentTransactions = await RewardsService.getTransactionHistory(user.uid, 5);
            setTransactions(recentTransactions);

            // Re-lock expired sessions
            await BlockerService.relockExpiredSessions(user.uid);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        await checkPermissions();
        setRefreshing(false);
    };

    const handleRequestPermissions = async () => {
        if (!hasUsagePermission) {
            await UsageService.requestPermission();
        }
        if (!hasAccessibilityPermission) {
            await BlockerService.requestAccessibilityPermission();
        }
        await checkPermissions();
    };

    const recentTransactionsList = transactions.slice(0, 3);

    return (
        <View>
            <Appbar.Header>
                <Appbar.Content title="FOOM" />
                <IconButton
                    icon={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
                    onPress={toggleTheme}
                />
                <IconButton icon="logout" onPress={signOut} />
            </Appbar.Header>
        </View>
    )
};





    export default DashboardScreen;
