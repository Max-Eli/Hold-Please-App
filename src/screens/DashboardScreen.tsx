import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAgents } from '../context/AgentContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { usageApi } from '../lib/api';

interface DailyData { date: string; count: number; }

interface Metrics {
  totalCalls: number;
  answered: number;
  missed: number;
  avgDuration: number;
  totalMinutes: number;
  answerRate: number;
  sentimentScore: number;
  sentimentCounts: { positive: number; neutral: number; negative: number };
  daily: DailyData[];
  recent: any[];
}

function compute(raw: any): Metrics {
  const list = Array.isArray(raw) ? raw : raw?.calls || raw?.data || [];
  let answered = 0, missed = 0, totalDuration = 0, durCount = 0;
  const sent = { positive: 0, neutral: 0, negative: 0 };
  const byDay: Record<string, number> = {};

  for (const c of list) {
    const st = (c.status || '').toLowerCase();
    if (st === 'completed' || st === 'ended') answered++;
    else missed++;
    if (c.duration > 0) { totalDuration += c.duration; durCount++; }
    const mood = (c.analysis?.sentiment || c.sentiment || '').toLowerCase();
    if (mood === 'positive') sent.positive++;
    else if (mood === 'negative') sent.negative++;
    else sent.neutral++;
    const ds = c.start_time || c.created_at;
    if (ds) byDay[ds.slice(0, 10)] = (byDay[ds.slice(0, 10)] || 0) + 1;
  }

  const daily: DailyData[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    daily.push({ date: d.toISOString().slice(0, 10), count: byDay[d.toISOString().slice(0, 10)] || 0 });
  }

  const total = list.length;
  const sentTotal = sent.positive + sent.neutral + sent.negative;
  const sentimentScore = sentTotal > 0 ? Math.round((sent.positive * 100 + sent.neutral * 50) / sentTotal) : 0;

  // Sort recent by start_time desc
  const sorted = [...list].sort((a: any, b: any) => {
    const ta = a.start_time || a.created_at || '';
    const tb = b.start_time || b.created_at || '';
    return tb.localeCompare(ta);
  });

  return {
    totalCalls: total, answered, missed,
    avgDuration: durCount > 0 ? totalDuration / durCount : 0,
    totalMinutes: Math.round(totalDuration / 60),
    answerRate: total > 0 ? Math.round((answered / total) * 100) : 0,
    sentimentScore, sentimentCounts: sent, daily,
    recent: sorted.slice(0, 5),
  };
}

function fmtDur(s: number): string {
  if (s <= 0) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtPhone(n?: string): string {
  if (!n) return 'Unknown';
  const c = n.replace(/\D/g, '');
  if (c.length === 11 && c.startsWith('1')) return `(${c.slice(1, 4)}) ${c.slice(4, 7)}-${c.slice(7)}`;
  if (c.length === 10) return `(${c.slice(0, 3)}) ${c.slice(3, 6)}-${c.slice(6)}`;
  return n;
}

function fmtRelative(ds?: string): string {
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

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { agents, refreshAgents } = useAgents();
  const { user, organizationId } = useAuth();
  const { isPro } = useSubscription();
  const st = createStyles(colors);

  // Prefer agent with a phone number
  const agent = agents.length > 0
    ? agents.find((a) => a.phoneNumber) || agents[0]
    : null;
  const [m, setM] = useState<Metrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) return;
    try { setM(compute(await usageApi.calls(organizationId))); } catch {}
  }, [organizationId]);

  useFocusEffect(useCallback(() => { load(); refreshAgents(); }, [load, refreshAgents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAgents(), load()]);
    setRefreshing(false);
  }, [refreshAgents, load]);

  const firstName = user?.fullName?.split(' ')[0] || '';

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        {/* Header */}
        <View style={st.header}>
          <Text style={st.hi}>{firstName ? `Hi, ${firstName}` : 'Dashboard'}</Text>
          <Text style={st.biz} numberOfLines={1}>{user?.businessName || ''}</Text>
        </View>

        {/* Agent Status Hero */}
        {agent ? (
          <TouchableOpacity
            style={st.heroCard}
            onPress={() => navigation.navigate('AgentDetail', { agentId: agent.id })}
            activeOpacity={0.7}
          >
            <View style={st.heroTop}>
              <View style={st.heroAvatar}>
                <Text style={st.heroLetter}>{agent.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.heroName}>{agent.name}</Text>
                <Text style={st.heroPhone}>{agent.phoneNumber || 'No number assigned'}</Text>
              </View>
              <View style={[st.heroBadge, { backgroundColor: agent.isActive ? colors.successSoft : colors.primarySoft }]}>
                <View style={[st.heroBadgeDot, { backgroundColor: agent.isActive ? colors.success : colors.textMuted }]} />
                <Text style={[st.heroBadgeText, { color: agent.isActive ? colors.success : colors.textMuted }]}>
                  {agent.isActive ? 'Live' : 'Off'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={st.setupCard} onPress={() => navigation.navigate('CreateAgent')} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={22} color={colors.textMuted} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.setupTitle}>Create your agent</Text>
              <Text style={st.setupDesc}>Set up an AI voice agent for your business</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Metrics */}
        <View style={st.metricsRow}>
          <View style={st.metric}>
            <Text style={st.metricNum}>{m ? m.totalCalls.toLocaleString() : '–'}</Text>
            <Text style={st.metricLabel}>Calls</Text>
          </View>
          <View style={st.metricSep} />
          <View style={st.metric}>
            <Text style={[st.metricNum, m && m.answerRate >= 80 && { color: colors.success }]}>
              {m ? `${m.answerRate}%` : '–'}
            </Text>
            <Text style={st.metricLabel}>Answered</Text>
          </View>
          <View style={st.metricSep} />
          <View style={st.metric}>
            <Text style={st.metricNum}>{m ? fmtDur(m.avgDuration) : '–'}</Text>
            <Text style={st.metricLabel}>Avg. call</Text>
          </View>
          <View style={st.metricSep} />
          <View style={st.metric}>
            <Text style={[st.metricNum, m && m.sentimentScore >= 70 && { color: colors.success }]}>
              {m && m.totalCalls > 0 ? m.sentimentScore : '–'}
            </Text>
            <Text style={st.metricLabel}>Score</Text>
          </View>
        </View>

        {/* Volume */}
        <View style={st.section}>
          <View style={st.sectionHead}>
            <Text style={st.sectionTitle}>Call volume</Text>
            <Text style={st.sectionSub}>Last 7 days</Text>
          </View>
          <View style={st.chart}>
            {(m?.daily || Array.from({ length: 7 }, (_, i) => ({ date: '', count: 0 }))).map((d, i) => {
              const max = Math.max(...(m?.daily || []).map((x) => x.count), 1);
              const pct = d.count / max;
              const today = i === (m?.daily.length || 7) - 1;
              const label = d.date
                ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.date + 'T12:00:00').getDay()]
                : '';
              return (
                <View key={d.date || i} style={st.col}>
                  <View style={st.colInner}>
                    <View style={[st.colBar, { height: `${Math.max(pct * 100, 5)}%`, backgroundColor: today ? colors.primary : colors.border }]} />
                  </View>
                  <Text style={[st.colDay, today && { color: colors.textPrimary, fontWeight: '600' }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sentiment */}
        {m && m.totalCalls > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Caller sentiment</Text>
            <View style={st.sentRow}>
              <View style={st.sentBar}>
                {m.sentimentCounts.positive > 0 && <View style={{ flex: m.sentimentCounts.positive, height: 6, backgroundColor: colors.success, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }} />}
                {m.sentimentCounts.neutral > 0 && <View style={{ flex: m.sentimentCounts.neutral, height: 6, backgroundColor: colors.border }} />}
                {m.sentimentCounts.negative > 0 && <View style={{ flex: m.sentimentCounts.negative, height: 6, backgroundColor: colors.error, borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />}
              </View>
              <View style={st.sentLabels}>
                {[
                  { c: colors.success, t: 'Positive', n: m.sentimentCounts.positive },
                  { c: colors.border, t: 'Neutral', n: m.sentimentCounts.neutral },
                  { c: colors.error, t: 'Negative', n: m.sentimentCounts.negative },
                ].map((x) => (
                  <View key={x.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{x.t} {m.totalCalls > 0 ? Math.round((x.n / m.totalCalls) * 100) : 0}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Leads */}
        {m && m.totalCalls > 0 && (
          <View style={st.section}>
            <View style={st.sectionHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={st.sectionTitle}>Leads</Text>
                {!isPro && <View style={st.proPill}><Text style={st.proPillText}>PRO</Text></View>}
              </View>
              <TouchableOpacity onPress={() => isPro ? navigation.navigate('Leads') : navigation.navigate('Subscription')}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                  {isPro ? 'View all' : 'Unlock'}
                </Text>
              </TouchableOpacity>
            </View>
            {isPro ? (
              m.recent.slice(0, 3).map((c: any, i: number) => {
                const summary = c.analysis?.summary || c.summary || '';
                const phone = c.from_number || c.caller_number || '';
                return (
                  <TouchableOpacity
                    key={c.id || i}
                    style={st.leadRow}
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate('Leads')}
                  >
                    <View style={st.leadDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.leadPhone}>{fmtPhone(phone)}</Text>
                      <Text style={st.leadSummary} numberOfLines={1}>{summary || 'No summary'}</Text>
                    </View>
                    <Text style={st.leadTime}>{fmtRelative(c.start_time || c.created_at)}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={st.leadLocked}>
                <Ionicons name="lock-closed" size={15} color={colors.textMuted} />
                <Text style={st.leadLockedText}>Upgrade to Pro to see leads extracted from your calls</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Activity */}
        {m && m.recent.length > 0 && (
          <View style={st.section}>
            <View style={st.sectionHead}>
              <Text style={st.sectionTitle}>Recent calls</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Calls' })}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>View all</Text>
              </TouchableOpacity>
            </View>
            {m.recent.map((c: any, i: number) => {
              const status = (c.status || '').toLowerCase();
              const ok = status === 'completed' || status === 'ended';
              return (
                <TouchableOpacity
                  key={c.id || i}
                  style={st.recentRow}
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('CallDetail', { call: c })}
                >
                  <View style={[st.recentIcon, { backgroundColor: ok ? colors.successSoft : colors.errorSoft }]}>
                    <Ionicons name={ok ? 'call' : 'call'} size={14} color={ok ? colors.success : colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.recentPhone}>{fmtPhone(c.from_number || c.caller_number)}</Text>
                    <Text style={st.recentMeta}>{fmtDur(c.duration || 0)} · {ok ? 'Answered' : 'Missed'}</Text>
                  </View>
                  <Text style={st.recentTime}>{fmtRelative(c.start_time || c.created_at)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---- Styles ---- */

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { marginTop: 12, marginBottom: 20 },
  hi: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  biz: { fontSize: 14, color: colors.textSecondary, marginTop: 1 },

  // Hero agent card
  heroCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroLetter: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  heroName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  heroPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: '600' },

  // Setup CTA
  setupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  setupTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  setupDesc: { fontSize: 13, color: colors.textMuted, marginTop: 1 },

  // Metrics bar
  metricsRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center' },
  metricNum: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  metricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  metricSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },

  // Sections
  section: { marginBottom: 24 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  sectionSub: { fontSize: 13, color: colors.textMuted },

  // Chart
  chart: { flexDirection: 'row', height: 110, gap: 6, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  col: { flex: 1, alignItems: 'center' },
  colInner: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  colBar: { width: '55%', borderRadius: 4, minHeight: 4 },
  colDay: { fontSize: 11, color: colors.textMuted, marginTop: 8 },

  // Sentiment
  sentRow: { gap: 10 },
  sentBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 },
  sentLabels: { flexDirection: 'row', gap: 16 },

  // Leads
  leadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  leadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10 },
  leadPhone: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  leadSummary: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  leadTime: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  leadLocked: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4 },
  leadLockedText: { fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 18 },
  proPill: { backgroundColor: 'rgba(255, 149, 0, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  proPillText: { fontSize: 10, fontWeight: '700', color: '#FF9500', letterSpacing: 0.5 },

  // Recent calls
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  recentIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  recentPhone: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  recentMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  recentTime: { fontSize: 12, color: colors.textMuted },
});
