import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Appbar,
  useTheme,
  Button,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useWalletStore } from '../store/useWalletStore';
import { RewardsService } from '../services/rewardsService';
import { WalletService } from '../services/walletService';
import type { Transaction } from '../types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type WalletNavigationProp = StackNavigationProp<RootStackParamList, 'Wallet'>;

const WalletScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<WalletNavigationProp>();
  const { user } = useAuthStore();
  const { balance, transactions, setBalance, setTransactions, setInvestments } = useWalletStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [totalInvested, setTotalInvested] = useState(0);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      // Load user data to get balance
      const userData = await useAuthStore.getState().loadUser(user.uid);
      if (userData) {
        setBalance(userData.tokensBalance || 0);
      }

      // Load transactions
      const txns = await RewardsService.getTransactionHistory(user.uid, 50);
      setTransactions(txns);

      // Load investments
      const investments = await WalletService.getUserInvestments(user.uid);
      setInvestments(investments);

      // Calculate total invested
      const invested = await WalletService.getTotalInvested(user.uid);
      setTotalInvested(invested);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'reward':
        return 'trophy';
      case 'unlock':
        return 'lock-open';
      case 'purchase':
        return 'cart';
      case 'investment':
        return 'chart-line';
      case 'withdrawal':
        return 'cash';
      default:
        return 'currency-usd';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <Card.Content style={styles.transactionContent}>
        <View style={styles.transactionIcon}>
          <Icon
            name={getTransactionIcon(item.type)}
            size={32}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text variant="titleMedium">
            {item.type === 'reward'
              ? 'Tokens Earned'
              : item.type === 'unlock'
              ? `Unlocked ${item.metadata?.appName || 'App'}`
              : item.type === 'purchase'
              ? 'Tokens Purchased'
              : item.type === 'investment'
              ? `Invested in ${item.metadata?.mmfName || 'MMF'}`
              : 'Withdrawal'}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
          {item.metadata?.minutes && (
            <Text variant="bodySmall" style={{ opacity: 0.6 }}>
              {item.metadata.minutes} minutes tracked
            </Text>
          )}
        </View>
        <View style={styles.transactionAmount}>
          <Text
            variant="titleLarge"
            style={{
              color: item.amount > 0 ? theme.colors.primary : theme.colors.error,
              fontWeight: 'bold',
            }}
          >
            {item.amount > 0 ? '+' : ''}
            {item.amount}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            Balance: {item.balance}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Wallet" />
      </Appbar.Header>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            {/* Balance Card */}
            <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Total Balance
                </Text>
                <Text
                  variant="displayMedium"
                  style={[styles.balanceAmount, { color: theme.colors.onPrimaryContainer }]}
                >
                  {balance}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  Tokens
                </Text>
              </Card.Content>
            </Card>

            {/* Investment Summary */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Investment Summary
                </Text>
                <View style={styles.investmentRow}>
                  <View style={styles.investmentItem}>
                    <Text variant="headlineSmall">{totalInvested}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                      Total Invested
                    </Text>
                  </View>
                  <View style={styles.investmentItem}>
                    <Text variant="headlineSmall">{balance}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                      Available
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="chart-line"
                onPress={() => navigation.navigate('Invest')}
                style={styles.actionButton}
              >
                Invest
              </Button>
              <Button
                mode="outlined"
                icon="cash"
                onPress={() => navigation.navigate('Withdraw')}
                style={styles.actionButton}
              >
                Withdraw
              </Button>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
              <Chip
                selected={filter === 'all'}
                onPress={() => setFilter('all')}
                style={styles.chip}
              >
                All
              </Chip>
              <Chip
                selected={filter === 'reward'}
                onPress={() => setFilter('reward')}
                style={styles.chip}
              >
                Rewards
              </Chip>
              <Chip
                selected={filter === 'investment'}
                onPress={() => setFilter('investment')}
                style={styles.chip}
              >
                Investments
              </Chip>
              <Chip
                selected={filter === 'unlock'}
                onPress={() => setFilter('unlock')}
                style={styles.chip}
              >
                Unlocks
              </Chip>
            </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Transaction History
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="history" size={64} color={theme.colors.surfaceVariant} />
            <Text variant="bodyLarge" style={{ opacity: 0.6, marginTop: 16 }}>
              No transactions yet
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    marginBottom: 16,
  },
  balanceAmount: {
    fontWeight: 'bold',
    marginVertical: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  investmentItem: {
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 0,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
});

export default WalletScreen;