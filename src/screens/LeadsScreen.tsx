import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usageApi } from '../lib/api';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Leads'>;
};

interface Lead {
  id: string;
  phone: string;
  phoneRaw: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'needs_followup' | 'completed';
  duration: number;
  time: string;
  raw: any;
}

type Filter = 'all' | 'needs_followup' | 'completed';

function extractLeads(raw: any): Lead[] {
  const list = Array.isArray(raw) ? raw : raw?.calls || raw?.data || [];

  return list
    .map((c: any) => {
      const phone = c.from_number || c.caller_number || c.phone_number || '';
      const analysis = c.analysis || {};
      const summary = analysis.summary || c.summary || '';
      const sentimentRaw = (analysis.sentiment || c.sentiment || 'neutral').toLowerCase();
      const sentiment: Lead['sentiment'] =
        sentimentRaw === 'positive' ? 'positive' :
        sentimentRaw === 'negative' ? 'negative' : 'neutral';
      const callStatus = (c.status || '').toLowerCase();
      const isCompleted = callStatus === 'completed' || callStatus === 'ended';
      const isMissed = callStatus === 'missed' || callStatus === 'no-answer' || callStatus === 'failed';

      // A lead needs follow-up if: missed, negative sentiment, or short duration with no resolution
      const needsFollowup = isMissed || sentiment === 'negative' || (!isCompleted && c.duration < 30);

      return {
        id: c.id,
        phone: fmtPhone(phone),
        phoneRaw: phone,
        summary: summary || (isMissed ? 'Missed call — no conversation recorded' : 'No summary available'),
        sentiment,
        status: needsFollowup ? 'needs_followup' as const : 'completed' as const,
        duration: c.duration || 0,
        time: c.start_time || c.created_at || '',
        raw: c,
      };
    })
    .filter((l: Lead) => l.phone) // Only include calls with a phone number
    .sort((a: Lead, b: Lead) => b.time.localeCompare(a.time));
}

function fmtPhone(n: string): string {
  const c = n.replace(/\D/g, '');
  if (c.length === 11 && c.startsWith('1')) return `(${c.slice(1, 4)}) ${c.slice(4, 7)}-${c.slice(7)}`;
  if (c.length === 10) return `(${c.slice(0, 3)}) ${c.slice(3, 6)}-${c.slice(6)}`;
  return n;
}

function fmtRelative(ds: string): string {
  if (!ds) return '';
  const diff = Date.now() - new Date(ds).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ds).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDur(s: number): string {
  if (s <= 0) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs_followup', label: 'Follow Up' },
  { key: 'completed', label: 'Handled' },
];

export default function LeadsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { organizationId } = useAuth();
  const s = createStyles(colors);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchLeads = useCallback(async () => {
    if (!organizationId) return;
    try {
      const raw = await usageApi.calls(organizationId);
      setLeads(extractLeads(raw));
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  }, [organizationId]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setIsLoading(true);
        await fetchLeads();
        setIsLoading(false);
      })();
    }, [fetchLeads])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  }, [fetchLeads]);

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);
  const followUpCount = leads.filter((l) => l.status === 'needs_followup').length;

  const callBack = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${digits}`);
  };

  const renderLead = ({ item }: { item: Lead }) => {
    const sentColor = item.sentiment === 'positive' ? colors.success
      : item.sentiment === 'negative' ? colors.error : colors.textMuted;
    const sentBg = item.sentiment === 'positive' ? colors.successSoft
      : item.sentiment === 'negative' ? colors.errorSoft : colors.primarySoft;
    const needsAction = item.status === 'needs_followup';

    return (
      <View style={[s.card, needsAction && s.cardUrgent]}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <View style={[s.callIcon, { backgroundColor: needsAction ? colors.errorSoft : colors.successSoft }]}>
              <Ionicons
                name={needsAction ? 'alert-circle' : 'checkmark-circle'}
                size={16}
                color={needsAction ? colors.error : colors.success}
              />
            </View>
            <View>
              <Text style={s.phone}>{item.phone}</Text>
              <Text style={s.time}>{fmtRelative(item.time)} · {fmtDur(item.duration)}</Text>
            </View>
          </View>
          <View style={[s.sentBadge, { backgroundColor: sentBg }]}>
            <Text style={[s.sentText, { color: sentColor }]}>
              {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={s.summary} numberOfLines={3}>{item.summary}</Text>

        {/* Actions */}
        <View style={s.actions}>
          {needsAction && (
            <View style={s.urgentPill}>
              <Text style={s.urgentText}>Needs follow-up</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={s.callbackBtn}
            onPress={() => callBack(item.phoneRaw)}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={14} color={colors.primary} />
            <Text style={s.callbackText}>Call Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.detailBtn}
            onPress={() => navigation.navigate('CallDetail', { call: item.raw })}
            activeOpacity={0.7}
          >
            <Text style={s.detailText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.stat}>
          <Text style={s.statNum}>{leads.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statSep} />
        <View style={s.stat}>
          <Text style={[s.statNum, followUpCount > 0 && { color: colors.error }]}>{followUpCount}</Text>
          <Text style={s.statLabel}>Follow Up</Text>
        </View>
        <View style={s.statSep} />
        <View style={s.stat}>
          <Text style={[s.statNum, { color: colors.success }]}>{leads.length - followUpCount}</Text>
          <Text style={s.statLabel}>Handled</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterPill, filter === f.key && s.filterActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
              {f.key === 'needs_followup' && followUpCount > 0 ? ` (${followUpCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderLead}
          contentContainerStyle={filtered.length === 0 ? s.emptyList : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBg}>
                <Ionicons name="people-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={s.emptyTitle}>No leads yet</Text>
              <Text style={s.emptyDesc}>
                {filter !== 'all'
                  ? 'No leads match this filter.'
                  : 'When your agent handles calls, leads will appear here automatically.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },

  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },

  // Filters
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
  },

  // List
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Lead card
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  callIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  sentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sentText: { fontSize: 11, fontWeight: '600' },

  // Summary
  summary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentPill: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  callbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  callbackText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  detailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  detailText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
