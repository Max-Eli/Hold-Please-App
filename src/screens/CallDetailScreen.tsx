import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAgents } from '../context/AgentContext';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { RootStackParamList } from '../types';

type CallDetailRouteProp = RouteProp<RootStackParamList, 'CallDetail'>;

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPhoneNumber(number?: string): string {
  if (!number) return 'Unknown';
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number;
}

function getSentimentIcon(sentiment?: string): {
  name: string;
  color: string;
  label: string;
} {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return { name: 'happy-outline', color: '#34C759', label: 'Positive' };
    case 'negative':
      return { name: 'sad-outline', color: '#FF3B30', label: 'Negative' };
    case 'neutral':
    default:
      return {
        name: 'remove-circle-outline',
        color: '#8E8E93',
        label: sentiment || 'Neutral',
      };
  }
}

function getStatusInfo(
  status: string | undefined,
  colors: ColorScheme
): { color: string; bgColor: string; label: string } {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'ended':
      return {
        color: colors.success,
        bgColor: colors.successSoft,
        label: 'Completed',
      };
    case 'missed':
    case 'no-answer':
      return {
        color: colors.error,
        bgColor: colors.errorSoft,
        label: 'Missed',
      };
    case 'failed':
      return {
        color: colors.error,
        bgColor: colors.errorSoft,
        label: 'Failed',
      };
    case 'in-progress':
      return {
        color: colors.warning,
        bgColor: colors.warningSoft,
        label: 'In Progress',
      };
    default:
      return {
        color: colors.textSecondary,
        bgColor: colors.primarySoft,
        label: status || 'Unknown',
      };
  }
}

export default function CallDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<CallDetailRouteProp>();
  const { agents } = useAgents();
  const call = route.params.call;

  const callerNumber = call.caller_number || call.from_number || call.phone_number;
  const createdAt = call.created_at || call.start_time || call.started_at;
  const endedAt = call.end_time || call.ended_at;
  const analysis = call.analysis || {};
  const summary = analysis.summary || call.summary;
  const sentiment = analysis.sentiment || call.sentiment;
  const transcript = analysis.transcript || analysis.transcription || call.transcript || call.transcription;

  // Debug: log what we received so we can verify fields
  console.log('[CALL_DETAIL] call keys:', Object.keys(call));
  console.log('[CALL_DETAIL] analysis keys:', Object.keys(analysis));
  console.log('[CALL_DETAIL] summary:', summary ? 'yes' : 'no', '| sentiment:', sentiment || 'none', '| transcript:', transcript ? 'yes' : 'no');

  const getAgentName = (): string => {
    if (call.agent_name) return call.agent_name;
    if (call.agent_id) {
      const agent = agents.find((a: any) => a.id === call.agent_id);
      if (agent) return agent.name;
    }
    return 'Unknown Agent';
  };

  const statusInfo = getStatusInfo(call.status, colors);
  const sentimentInfo = getSentimentIcon(sentiment);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Call Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Card */}
        <View style={styles.card}>
          <View style={styles.overviewHeader}>
            <View style={styles.callIconBg}>
              <Ionicons name="call" size={20} color={colors.primary} />
            </View>
            <View style={styles.overviewInfo}>
              <Text style={styles.overviewAgent}>{getAgentName()}</Text>
              <Text style={styles.overviewNumber}>
                {formatPhoneNumber(callerNumber)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {formatDuration(call.duration)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Direction</Text>
              <Text style={styles.detailValue}>
                {call.direction
                  ? call.direction.charAt(0).toUpperCase() +
                    call.direction.slice(1)
                  : 'Inbound'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(createdAt)}
              </Text>
            </View>
            {endedAt && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ended</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(endedAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sentiment Card */}
        {sentiment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sentiment</Text>
            <View style={styles.sentimentRow}>
              <Ionicons
                name={sentimentInfo.name as any}
                size={24}
                color={sentimentInfo.color}
              />
              <Text style={styles.sentimentLabel}>{sentimentInfo.label}</Text>
            </View>
          </View>
        )}

        {/* Summary Card */}
        {summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Summary</Text>
            <Text style={styles.cardBody}>{summary}</Text>
          </View>
        )}

        {/* Transcript Card */}
        {transcript && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transcript</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        {/* No analysis available */}
        {!summary && !transcript && !sentiment && (
          <View style={styles.card}>
            <View style={styles.noAnalysis}>
              <Ionicons name="document-text-outline" size={28} color={colors.textMuted} />
              <Text style={styles.noAnalysisText}>
                No analysis available for this call yet.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      backgroundColor: colors.primarySoft,
    },
    headerBarTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    overviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    callIconBg: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overviewInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    overviewAgent: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    overviewNumber: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    statusText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    detailItem: {
      width: '50%',
      marginBottom: spacing.md,
    },
    detailLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: fontSize.md,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    sentimentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sentimentLabel: {
      fontSize: fontSize.md,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    cardBody: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    transcriptText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    noAnalysis: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    noAnalysisText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
