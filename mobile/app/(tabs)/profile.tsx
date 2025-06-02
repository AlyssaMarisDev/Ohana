import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryFn, apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { HouseholdWithMembers } from '@shared/schema';

export default function ProfileScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
    queryFn,
  });

  // Fetch Google Calendar connection status
  const { data: googleStatus, isLoading: googleStatusLoading } = useQuery<{connected: boolean, syncEnabled: boolean}>({
    queryKey: ["/api/google/status"],
    queryFn,
  });

  // Manual Google Calendar sync
  const syncGoogleMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/api/google/sync");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  // Disconnect Google Calendar
  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/api/google/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
    },
  });

  const handleLogout = () => {
    // Navigate to login screen or handle logout
    console.log('Logout functionality to be implemented');
  };

  const handleConnectGoogleCalendar = () => {
    // Handle Google Calendar OAuth flow for mobile
    console.log('Google Calendar connection to be implemented');
  };

  const handleDisconnectGoogleCalendar = () => {
    disconnectGoogleMutation.mutate();
  };

  const handleSyncGoogleCalendar = () => {
    syncGoogleMutation.mutate();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.userInfo}>
            {user.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={32} color="#6b7280" />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : 'User'
                }
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </View>

        {/* Households */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="home" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Your Households</Text>
          </View>

          {householdsLoading ? (
            <Text style={styles.loadingText}>Loading households...</Text>
          ) : households && households.length > 0 ? (
            households.map(household => (
              <View key={household.id} style={styles.householdCard}>
                <View style={styles.householdInfo}>
                  <Text style={styles.householdName}>{household.name}</Text>
                  {household.description && (
                    <Text style={styles.householdDescription}>{household.description}</Text>
                  )}
                  <Text style={styles.householdMembers}>
                    {household.memberCount} member{household.memberCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="home" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>You're not part of any households yet</Text>
            </View>
          )}
        </View>

        {/* Google Calendar Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="calendar-today" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Integrations</Text>
          </View>

          {googleStatusLoading ? (
            <Text style={styles.loadingText}>Loading integration status...</Text>
          ) : (
            <View style={styles.integrationCard}>
              <View style={styles.integrationInfo}>
                <View style={styles.integrationIcon}>
                  <MaterialIcons name="calendar-today" size={16} color="#ffffff" />
                </View>
                <View style={styles.integrationDetails}>
                  <Text style={styles.integrationName}>Google Calendar</Text>
                  <Text style={styles.integrationStatus}>
                    {googleStatus?.connected ? 'Sync enabled' : 'Connect to sync your calendar events'}
                  </Text>
                </View>
              </View>
              
              {googleStatus?.connected ? (
                <View style={styles.integrationActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.syncButton]}
                    onPress={handleSyncGoogleCalendar}
                    disabled={syncGoogleMutation.isPending}
                  >
                    <Text style={styles.syncButtonText}>
                      {syncGoogleMutation.isPending ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.disconnectButton]}
                    onPress={handleDisconnectGoogleCalendar}
                    disabled={disconnectGoogleMutation.isPending}
                  >
                    <Text style={styles.disconnectButtonText}>
                      {disconnectGoogleMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.connectButton]}
                  onPress={handleConnectGoogleCalendar}
                >
                  <Text style={styles.connectButtonText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  householdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  householdDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  householdMembers: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationDetails: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  integrationStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  integrationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  syncButton: {
    backgroundColor: '#ffffff',
    borderColor: '#3b82f6',
  },
  syncButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});