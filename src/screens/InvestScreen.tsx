import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  Appbar,
  useTheme,
  TextInput,
  Snackbar,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useWalletStore } from '../store/useWalletStore';
import { WalletService } from '../services/walletService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const InvestScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { balance } = useWalletStore();

  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      showSnackbar('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > balance) {
      showSnackbar('Insufficient balance');
      return;
    }

    if (!phoneNumber) {
      showSnackbar('Please enter your M-Pesa phone number');
      return;
    }

    setDialogVisible(true);
  };

  const confirmWithdraw = async () => {
    if (!user) return;

    setLoading(true);
    setDialogVisible(false);

    try {
      const result = await WalletService.withdrawTokens(
        user.uid,
        parseFloat(amount),
        phoneNumber
      );

      if (result.success) {
        showSnackbar(result.message);
        setAmount('');
        setPhoneNumber('');
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        showSnackbar(result.message);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showSnackbar('Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Withdraw" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <View style={styles.balanceRow}>
              <Icon name="wallet" size={32} color={theme.colors.onPrimaryContainer} />
              <View style={styles.balanceInfo}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Available Balance
                </Text>
                <Text
                  variant="headlineSmall"
                  style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}
                >
                  {balance} tokens
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Withdrawal Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Icon name="information" size={24} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12 }}>
                Withdraw your tokens to M-Pesa. 1 token = 1 KES. Processing may take a few minutes.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Withdrawal Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Withdrawal Details
            </Text>

            <TextInput
              label="Amount (Tokens)"
              value={amount}
              onChangeText={setAmount}
              mode="outlined"
              keyboardType="numeric"
              left={<TextInput.Icon icon="cash" />}
              right={
                <TextInput.Icon
                  icon="wallet"
                  onPress={setMaxAmount}
                />
              }
              style={styles.input}
            />

            <Button
              mode="text"
              onPress={setMaxAmount}
              style={styles.maxButton}
              compact
            >
              Withdraw Maximum ({balance} tokens)
            </Button>

            <TextInput
              label="M-Pesa Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="254XXXXXXXXX"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input}
            />

            {amount && (
              <View style={styles.calculationCard}>
                <View style={styles.calculationRow}>
                  <Text variant="bodyMedium">You will receive:</Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                    KES {parseFloat(amount || '0').toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Warning Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <View style={styles.warningRow}>
              <Icon name="alert" size={24} color={theme.colors.onErrorContainer} />
              <Text
                variant="bodyMedium"
                style={{ flex: 1, marginLeft: 12, color: theme.colors.onErrorContainer }}
              >
                Please ensure your M-Pesa number is correct. Withdrawals cannot be reversed.
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleWithdraw}
          loading={loading}
          disabled={loading || !amount || !phoneNumber}
          icon="cash"
          style={styles.withdrawButton}
        >
          Withdraw to M-Pesa
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Confirm Withdrawal</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to withdraw {amount} tokens (KES {amount}) to {phoneNumber}?
              {'\n\n'}This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmWithdraw}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  balanceInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  maxButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  calculationCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  withdrawButton: {
    marginTop: 8,
  },
});

export default InvestScreen;