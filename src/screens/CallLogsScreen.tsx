import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAgents } from '../context/AgentContext';
import { usageApi } from '../lib/api';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CallItem {
  id: string;
  agent_id?: string;
  agent_name?: string;
  caller_number?: string;
  from_number?: string;
  to_number?: string;
  duration?: number;
  status?: string;
  created_at?: string;
  started_at?: string;
  start_time?: string;
  end_time?: string;
  direction?: string;
  sentiment?: string;
  summary?: string;
  transcript?: string;
  analysis?: any;
  _raw?: any; // keep raw data for detail screen
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusColor(status: string | undefined, colors: ColorScheme) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'ended':
      return colors.success;
    case 'missed':
    case 'no-answer':
    case 'failed':
      return colors.error;
    case 'in-progress':
    case 'ringing':
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

function getStatusLabel(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'ended':
      return 'Completed';
    case 'missed':
    case 'no-answer':
      return 'Missed';
    case 'failed':
      return 'Failed';
    case 'in-progress':
      return 'In Progress';
    case 'ringing':
      return 'Ringing';
    default:
      return status || 'Unknown';
  }
}

export default function CallLogsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { organizationId } = useAuth();
  const { agents } = useAgents();

  const [calls, setCalls] = useState<CallItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    if (!organizationId) return;
    try {
      setError(null);
      const raw = await usageApi.calls(organizationId);
      console.log('[CALLS] raw response:', JSON.stringify(raw).slice(0, 500));
      // API may return array directly or wrapped in { calls: [...] } or { data: [...] }
      const data = Array.isArray(raw) ? raw : (raw as any)?.calls || (raw as any)?.data || [];
      const mapped: CallItem[] = (data || []).map((c: any) => ({
        id: c.id,
        agent_id: c.agent_id,
        agent_name: c.agent_name,
        caller_number: c.caller_number || c.from_number || c.phone_number,
        from_number: c.from_number,
        to_number: c.to_number,
        duration: c.duration,
        status: c.status,
        created_at: c.created_at || c.start_time,
        started_at: c.started_at || c.start_time,
        start_time: c.start_time,
        end_time: c.end_time,
        direction: c.direction,
        sentiment: c.analysis?.sentiment || c.sentiment,
        summary: c.analysis?.summary || c.summary,
        transcript: c.analysis?.transcript || c.transcript,
        analysis: c.analysis,
        _raw: c,
      }));
      setCalls(mapped);
    } catch (err: any) {
      console.error('Failed to fetch calls:', err);
      setError('Failed to load calls');
    }
  }, [organizationId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchCalls();
      setIsLoading(false);
    };
    load();
  }, [fetchCalls]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCalls();
    setIsRefreshing(false);
  }, [fetchCalls]);

  const getAgentName = useCallback(
    (call: CallItem): string => {
      if (call.agent_name) return call.agent_name;
      if (call.agent_id) {
        const agent = agents.find((a) => a.id === call.agent_id);
        if (agent) return agent.name;
        return 'Deleted Agent';
      }
      return 'Unknown Agent';
    },
    [agents]
  );

  const formatPhoneNumber = (number?: string): string => {
    if (!number) return 'Unknown';
    // Simple formatting for US numbers
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return number;
  };

  const renderCallItem = ({ item }: { item: CallItem }) => {
    const statusColor = getStatusColor(item.status, colors);

    return (
      <TouchableOpacity
        style={styles.callCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CallDetail', { call: item._raw || item })}
      >
        <View style={styles.callIconContainer}>
          <View style={[styles.callIconBg, { backgroundColor: colors.primarySoft }]}>
            <Ionicons
              name={
                item.direction === 'outbound'
                  ? 'call-outline'
                  : 'call-outline'
              }
              size={18}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.callInfo}>
          <Text style={styles.agentName} numberOfLines={1}>
            {getAgentName(item)}
          </Text>
          <Text style={styles.callerNumber} numberOfLines={1}>
            {formatPhoneNumber(item.caller_number)}
          </Text>
        </View>

        <View style={styles.callMeta}>
          <Text style={styles.callTime}>
            {formatRelativeTime(item.created_at || item.started_at)}
          </Text>
          <View style={styles.callDetails}>
            <Text style={styles.callDuration}>
              {formatDuration(item.duration)}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="call-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No calls yet</Text>
        <Text style={styles.emptySubtitle}>
          When your agents handle calls, they will appear here.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            calls.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    callCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    callIconContainer: {
      marginRight: spacing.md,
    },
    callIconBg: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    callInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    agentName: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    callerNumber: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    callMeta: {
      alignItems: 'flex-end',
    },
    callTime: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: 4,
    },
    callDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    callDuration: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIconBg: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    emptySubtitle: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    retryText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: '600',
    },
  });
