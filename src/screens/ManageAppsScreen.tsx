import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Platform } from 'react-native';
import {
  Text,
  Searchbar,
  List,
  Switch,
  Appbar,
  useTheme,
  Snackbar,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { BlockerService } from '../services/blockerService';
import type { InstalledApp } from '../types';
import { NativeModules } from 'react-native';

const { UsageModule } = NativeModules;

const ManageAppsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { installedApps, lockedApps, setInstalledApps, setLockedApps, toggleAppLock } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);

  useEffect(() => {
    loadInstalledApps();
  }, []);

  const loadInstalledApps = async () => {
    if (Platform.OS !== 'android') {
      // Provide mock data for iOS
      setInstalledApps([
        { packageName: 'com.example.app1', appName: 'Example App 1', isLocked: false },
        { packageName: 'com.example.app2', appName: 'Example App 2', isLocked: false },
      ]);
      return;
    }

    setLoading(true);
    try {
      const apps = await UsageModule.getInstalledApps();
      const appsWithLockStatus = apps.map((app: InstalledApp) => ({
        ...app,
        isLocked: lockedApps.includes(app.packageName),
      }));
      setInstalledApps(appsWithLockStatus);
    } catch (error) {
      console.error('Error loading installed apps:', error);
      showSnackbar('Failed to load installed apps');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (app: InstalledApp) => {
    if (!user) return;

    try {
      if (app.isLocked) {
        // Unlocking permanently
        setSelectedApp(app);
        setDialogVisible(true);
      } else {
        // Locking
        await BlockerService.lockApp(user.uid, app.packageName);
        toggleAppLock(app.packageName);
        showSnackbar(`${app.appName} locked`);
      }
    } catch (error) {
      console.error('Error toggling app lock:', error);
      showSnackbar('Failed to update app lock');
    }
  };

  const confirmUnlock = async () => {
    if (!selectedApp || !user) return;

    try {
      await BlockerService.unlockAppPermanently(user.uid, selectedApp.packageName);
      toggleAppLock(selectedApp.packageName);
      showSnackbar(`${selectedApp.appName} unlocked`);
      setDialogVisible(false);
      setSelectedApp(null);
    } catch (error) {
      console.error('Error unlocking app:', error);
      showSnackbar('Failed to unlock app');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const filteredApps = installedApps.filter((app) =>
    app.appName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAppItem = ({ item }: { item: InstalledApp }) => (
    <List.Item
      title={item.appName}
      description={item.packageName}
      left={(props) => <List.Icon {...props} icon="application" />}
      right={() => (
        <Switch
          value={item.isLocked}
          onValueChange={() => handleToggleLock(item)}
          color={theme.colors.primary}
        />
      )}
      style={styles.listItem}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Manage Apps" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search apps"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <Text variant="bodyMedium" style={styles.helperText}>
          Lock apps to prevent access. Unlock by spending tokens or remove the lock here.
        </Text>

        <FlatList
          data={filteredApps}
          renderItem={renderAppItem}
          keyExtractor={(item) => item.packageName}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
                {loading ? 'Loading apps...' : 'No apps found'}
              </Text>
            </View>
          }
        />
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Unlock App Permanently</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to permanently unlock {selectedApp?.appName}? You can lock it again later.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmUnlock}>Unlock</Button>
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
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  helperText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 16,
  },
  listItem: {
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
});

export default ManageAppsScreen;