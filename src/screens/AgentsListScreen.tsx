import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Linking,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import * as RNClipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAgents } from '../context/AgentContext';
import { useSubscription } from '../context/SubscriptionContext';
import { agentsApi } from '../lib/api';

const VOICES: { id: string; name: string; desc: string }[] = [
  { id: 'alloy', name: 'Alloy', desc: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', desc: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', desc: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', desc: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', desc: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Clear and professional' },
];

export default function AgentsListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { agents, isLoading, refreshAgents, updateAgent, removeAgent } = useAgents();
  const { isPro } = useSubscription();

  // Prefer agent with a phone number assigned
  const agent = agents.length > 0
    ? agents.find((a) => a.phoneNumber) || agents[0]
    : null;

  const [voiceId, setVoiceId] = useState('alloy');
  const [sysPrompt, setSysPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(agent?.isActive ?? false);
  const [refreshing, setRefreshing] = useState(false);

  const [editGreeting, setEditGreeting] = useState(false);
  const [greetDraft, setGreetDraft] = useState(agent?.greeting ?? '');
  const greetRef = useRef<TextInput>(null);

  const [voiceModal, setVoiceModal] = useState(false);

  useEffect(() => {
    if (!agent) { setLoading(false); return; }
    let c = false;
    (async () => {
      try {
        const d = await agentsApi.get(agent.id);
        if (c) return;
        setVoiceId(d.voice_id || 'alloy');
        setSysPrompt(d.system_prompt || '');
      } catch {}
      if (!c) setLoading(false);
    })();
    return () => { c = true; };
  }, [agent?.id]);

  useEffect(() => {
    if (agent) { setIsActive(agent.isActive); setGreetDraft(agent.greeting); }
  }, [agent]);

  const onRefresh = async () => { setRefreshing(true); await refreshAgents(); setRefreshing(false); };

  // Empty state
  if (!agent && !isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.emptyScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
          <View style={s.emptyCenter}>
            <View style={s.emptyIcon}>
              <Ionicons name="mic-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>Set up your agent</Text>
            <Text style={s.emptyDesc}>Create an AI voice agent that answers calls for your business 24/7.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateAgent')} activeOpacity={0.7}>
              <Text style={s.emptyBtnText}>Create Agent</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!agent) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const toggle = async () => {
    const n = !isActive; setIsActive(n);
    try { await updateAgent(agent.id, { is_active: n }); }
    catch { setIsActive(!n); Alert.alert('Error', 'Failed to update status'); }
  };

  const saveGreet = async () => {
    setEditGreeting(false);
    const v = greetDraft.trim();
    if (v === agent.greeting) return;
    try { await updateAgent(agent.id, { first_message: v }); }
    catch { setGreetDraft(agent.greeting); Alert.alert('Error', 'Failed to update'); }
  };

  const pickVoice = async (id: string) => {
    const prev = voiceId; setVoiceId(id); setVoiceModal(false);
    try { await updateAgent(agent.id, { voice_id: id }); }
    catch { setVoiceId(prev); Alert.alert('Error', 'Failed to update voice'); }
  };

  const copyPhone = async () => {
    if (agent.phoneNumber) {
      await RNClipboard.setStringAsync(agent.phoneNumber);
      Alert.alert('Copied', 'Phone number copied');
    }
  };

  const enableFwd = () => { if (agent.phoneNumber) Linking.openURL(`tel:*72${agent.phoneNumber.replace(/[^0-9]/g, '')}`); };
  const disableFwd = () => Linking.openURL('tel:*73');

  const doDelete = () => {
    Alert.alert('Delete Agent', `Delete "${agent.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await removeAgent(agent.id); } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to delete agent'); } } },
    ]);
  };

  const voice = VOICES.find((v) => v.id === voiceId) || VOICES[0];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <View style={s.header}>
          <Text style={s.pageTitle}>Agent</Text>
        </View>

        {/* Identity */}
        <View style={s.identity}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{agent.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{agent.name}</Text>
            <View style={s.statusRow}>
              <View style={[s.dot, { backgroundColor: isActive ? colors.success : colors.textMuted }]} />
              <Text style={[s.statusText, { color: isActive ? colors.success : colors.textMuted }]}>
                {isActive ? 'Live' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Switch value={isActive} onValueChange={toggle} trackColor={{ false: colors.switchTrack, true: colors.success }} thumbColor={colors.white} />
        </View>

        {/* Phone */}
        <Text style={s.label}>Phone Number</Text>
        <View style={s.card}>
          {agent.phoneNumber ? (
            <>
              <TouchableOpacity style={s.row} onPress={copyPhone} activeOpacity={0.6}>
                <View style={{ flex: 1 }}>
                  <Text style={s.phoneNum}>{agent.phoneNumber}</Text>
                  <Text style={s.phoneSub}>Tap to copy</Text>
                </View>
                <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={s.sep} />
              <View style={s.fwd}>
                <Text style={s.fwdDesc}>Forward your business line to this number so your agent answers calls.</Text>
                <TouchableOpacity style={s.fwdBtn} onPress={enableFwd} activeOpacity={0.7}>
                  <Text style={s.fwdBtnText}>Enable Forwarding</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.fwdBtn2} onPress={disableFwd} activeOpacity={0.7}>
                  <Text style={s.fwdBtn2Text}>Disable</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>A number will be assigned automatically.</Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <Text style={s.label}>Settings</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => { setEditGreeting(true); setTimeout(() => greetRef.current?.focus(), 100); }}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Greeting</Text>
              {editGreeting ? (
                <TextInput ref={greetRef} style={s.greetInput} value={greetDraft} onChangeText={setGreetDraft} onBlur={saveGreet} onSubmitEditing={saveGreet} returnKeyType="done" multiline placeholderTextColor={colors.textMuted} selectionColor={colors.primary} />
              ) : (
                <Text style={s.rowValue} numberOfLines={2}>{agent.greeting || 'Not set'}</Text>
              )}
            </View>
            {!editGreeting && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
          </TouchableOpacity>
          <View style={s.sep} />
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => setVoiceModal(true)}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Voice</Text>
              {loading ? <ActivityIndicator size="small" color={colors.textMuted} style={{ alignSelf: 'flex-start', marginTop: 2 }} /> : (
                <Text style={s.rowValue}>{voice.name} — {voice.desc}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.sep} />
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => {
            if (isPro) {
              navigation.navigate('AgentKnowledge', { agentId: agent.id });
            } else {
              navigation.navigate('Subscription');
            }
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.rowLabel}>Agent Knowledge</Text>
                {!isPro && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={s.rowValue}>Business info, FAQs & instructions</Text>
            </View>
            <Ionicons name={isPro ? 'chevron-forward' : 'lock-closed'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.sep} />
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => {
            if (isPro) {
              navigation.navigate('BusinessHours', { agentId: agent.id });
            } else {
              navigation.navigate('Subscription');
            }
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.rowLabel}>Business Hours</Text>
                {!isPro && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={s.rowValue}>Set when your agent is active</Text>
            </View>
            <Ionicons name={isPro ? 'chevron-forward' : 'lock-closed'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.sep} />
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => {
            if (isPro) {
              navigation.navigate('AppointmentSettings', { agentId: agent.id });
            } else {
              navigation.navigate('Subscription');
            }
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.rowLabel}>Appointments</Text>
                {!isPro && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={s.rowValue}>Let your agent book appointments</Text>
            </View>
            <Ionicons name={isPro ? 'chevron-forward' : 'lock-closed'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.delBtn} onPress={doDelete} activeOpacity={0.6}>
          <Text style={s.delText}>Delete Agent</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voice picker */}
      <Modal visible={voiceModal} animationType="slide" transparent onRequestClose={() => setVoiceModal(false)}>
        <Pressable style={s.overlay} onPress={() => setVoiceModal(false)}>
          <Pressable style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Select Voice</Text>
            {VOICES.map((v) => {
              const sel = v.id === voiceId;
              return (
                <TouchableOpacity key={v.id} style={[s.vRow, sel && s.vRowSel]} onPress={() => pickVoice(v.id)} activeOpacity={0.6}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.vName, sel && { fontWeight: '600' }]}>{v.name}</Text>
                    <Text style={s.vDesc}>{v.desc}</Text>
                  </View>
                  {sel && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyScroll: { flexGrow: 1 },

  header: { marginTop: 12, marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },

  identity: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 24 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarLetter: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  name: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },

  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },

  row: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 56 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginBottom: 2 },
  rowValue: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  greetInput: { fontSize: 14, color: colors.textPrimary, marginTop: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.borderLight, lineHeight: 20 },

  phoneNum: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, letterSpacing: 0.3 },
  phoneSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  fwd: { padding: 16 },
  fwdDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 12 },
  fwdBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  fwdBtnText: { color: colors.background, fontSize: 15, fontWeight: '600' },
  fwdBtn2: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  fwdBtn2Text: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },

  delBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.errorSoft, marginTop: 8 },
  delText: { color: colors.error, fontSize: 15, fontWeight: '500' },

  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: colors.background, fontSize: 16, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  vRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: colors.primarySoft },
  vRowSel: { borderWidth: 1, borderColor: colors.primary },
  vName: { fontSize: 15, fontWeight: '400', color: colors.textPrimary, marginBottom: 1 },
  vDesc: { fontSize: 13, color: colors.textSecondary },

  pHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  pCancel: { fontSize: 16, color: colors.textSecondary },
  pTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  pSave: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  pInput: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingHorizontal: 20, paddingTop: 16, lineHeight: 24 },

  proBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
});
