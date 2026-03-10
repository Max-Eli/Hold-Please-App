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
} from 'react-native';
import * as RNClipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { useAgents } from '../context/AgentContext';
import { agentsApi } from '../lib/api';

const VOICE_OPTIONS: { id: string; name: string; description: string }[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and professional' },
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgentDetail'>;
  route: RouteProp<RootStackParamList, 'AgentDetail'>;
};

export default function AgentDetailScreen({ navigation, route }: Props) {
  const { agentId } = route.params;
  const { agents, updateAgent, removeAgent } = useAgents();
  const agent = agents.find((a) => a.id === agentId);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [voiceId, setVoiceId] = useState('alloy');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [backendLoading, setBackendLoading] = useState(true);
  const [isActive, setIsActive] = useState(agent?.isActive ?? false);

  // Greeting editing
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingDraft, setGreetingDraft] = useState(agent?.greeting ?? '');
  const greetingInputRef = useRef<TextInput>(null);

  // Voice picker modal
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  // System prompt modal
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await agentsApi.get(agentId);
        if (cancelled) return;
        setVoiceId(data.voice_id || 'alloy');
        setSystemPrompt(data.system_prompt || '');
        setPromptDraft(data.system_prompt || '');
      } catch (err) {
        console.warn('Failed to fetch agent details:', err);
      } finally {
        if (!cancelled) setBackendLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  useEffect(() => {
    if (agent) {
      setIsActive(agent.isActive);
      setGreetingDraft(agent.greeting);
    }
  }, [agent]);

  if (!agent) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Agent not found</Text>
      </SafeAreaView>
    );
  }

  const toggleActive = async () => {
    const newValue = !isActive;
    setIsActive(newValue);
    try {
      await updateAgent(agent.id, { is_active: newValue });
    } catch {
      setIsActive(!newValue);
      Alert.alert('Error', 'Failed to update agent status');
    }
  };

  const saveGreeting = async () => {
    setEditingGreeting(false);
    const trimmed = greetingDraft.trim();
    if (trimmed === agent.greeting) return;
    try {
      await updateAgent(agent.id, { first_message: trimmed });
    } catch {
      setGreetingDraft(agent.greeting);
      Alert.alert('Error', 'Failed to update greeting');
    }
  };

  const selectVoice = async (newVoice: string) => {
    const oldVoice = voiceId;
    setVoiceId(newVoice);
    setVoiceModalVisible(false);
    try {
      await updateAgent(agent.id, { voice_id: newVoice });
    } catch {
      setVoiceId(oldVoice);
      Alert.alert('Error', 'Failed to update voice');
    }
  };

  const openPromptEditor = () => {
    setPromptDraft(systemPrompt);
    setPromptModalVisible(true);
  };

  const saveSystemPrompt = async () => {
    setPromptModalVisible(false);
    const trimmed = promptDraft.trim();
    if (trimmed === systemPrompt) return;
    const oldPrompt = systemPrompt;
    setSystemPrompt(trimmed);
    try {
      await updateAgent(agent.id, { system_prompt: trimmed });
    } catch {
      setSystemPrompt(oldPrompt);
      setPromptDraft(oldPrompt);
      Alert.alert('Error', 'Failed to update system prompt');
    }
  };

  const copyPhoneNumber = async () => {
    if (agent.phoneNumber) {
      await RNClipboard.setStringAsync(agent.phoneNumber);
      Alert.alert('Copied', 'Phone number copied to clipboard');
    }
  };

  const enableForwarding = () => {
    if (!agent.phoneNumber) return;
    const raw = agent.phoneNumber.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:*72${raw}`);
  };

  const disableForwarding = () => {
    Linking.openURL('tel:*73');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Agent',
      `Are you sure you want to delete "${agent.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAgent(agent.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete agent');
            }
          },
        },
      ]
    );
  };

  const currentVoice = VOICE_OPTIONS.find((v) => v.id === voiceId) || VOICE_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation */}
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Agent Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? colors.success : colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isActive ? colors.success : colors.textMuted },
                ]}
              >
                {isActive ? 'Live' : 'Inactive'}
              </Text>
              <Text style={styles.headerDivider}>·</Text>
              <Text style={styles.headerMeta}>
                {agent.callsHandled} call{agent.callsHandled !== 1 ? 's' : ''} handled
              </Text>
            </View>
          </View>
          <Switch
            value={isActive}
            onValueChange={toggleActive}
            trackColor={{ false: colors.switchTrack, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>

        {/* Call Forwarding */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CALL FORWARDING</Text>
          <View style={styles.card}>
            {agent.phoneNumber ? (
              <>
                <View style={styles.phoneRow}>
                  <View style={styles.phoneInfo}>
                    <Text style={styles.phoneLabel}>AGENT NUMBER</Text>
                    <Text style={styles.phoneNumber}>{agent.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtn} onPress={copyPhoneNumber}>
                    <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.forwardingActions}>
                  <Text style={styles.forwardingDesc}>
                    Tap below to forward your incoming calls to this AI agent. Your phone will open the dialer — just press call.
                  </Text>
                  <TouchableOpacity
                    style={styles.forwardBtn}
                    onPress={enableForwarding}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.black} />
                    <Text style={styles.forwardBtnText}>Enable Call Forwarding</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disableBtn}
                    onPress={disableForwarding}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.disableBtnText}>Disable Forwarding</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.noPhonePadding}>
                <Text style={styles.noPhoneText}>No phone number assigned</Text>
                <Text style={styles.noPhoneSubtext}>
                  A number will be automatically assigned when available.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIGURATION</Text>
          <View style={styles.card}>
            {/* Greeting */}
            <TouchableOpacity
              style={styles.configRow}
              activeOpacity={0.6}
              onPress={() => {
                setEditingGreeting(true);
                setTimeout(() => greetingInputRef.current?.focus(), 100);
              }}
            >
              <View style={styles.configLeft}>
                <Text style={styles.configLabel}>Greeting</Text>
                {editingGreeting ? (
                  <TextInput
                    ref={greetingInputRef}
                    style={styles.greetingInput}
                    value={greetingDraft}
                    onChangeText={setGreetingDraft}
                    onBlur={saveGreeting}
                    onSubmitEditing={saveGreeting}
                    returnKeyType="done"
                    multiline
                    placeholderTextColor={colors.textMuted}
                    placeholder="Enter greeting message..."
                    selectionColor={colors.primary}
                  />
                ) : (
                  <Text style={styles.configValue} numberOfLines={2}>
                    {agent.greeting || 'No greeting set'}
                  </Text>
                )}
              </View>
              {!editingGreeting && (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            {/* Voice */}
            <TouchableOpacity
              style={styles.configRow}
              activeOpacity={0.6}
              onPress={() => setVoiceModalVisible(true)}
            >
              <View style={styles.configLeft}>
                <Text style={styles.configLabel}>Voice</Text>
                {backendLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textMuted}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  />
                ) : (
                  <Text style={styles.configValue}>
                    {currentVoice.name} — {currentVoice.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            {/* System Prompt */}
            <TouchableOpacity
              style={styles.configRow}
              activeOpacity={0.6}
              onPress={openPromptEditor}
            >
              <View style={styles.configLeft}>
                <Text style={styles.configLabel}>System Prompt</Text>
                {backendLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textMuted}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  />
                ) : (
                  <Text style={styles.configValue} numberOfLines={2}>
                    {systemPrompt
                      ? systemPrompt.substring(0, 80) + (systemPrompt.length > 80 ? '...' : '')
                      : 'No system prompt set'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            {/* Business Type */}
            <View style={styles.configRow}>
              <View style={styles.configLeft}>
                <Text style={styles.configLabel}>Business Type</Text>
                <Text style={styles.configValue}>
                  {agent.businessType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: spacing.lg }]}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.6}>
            <Text style={styles.deleteText}>Delete Agent</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Voice Picker Modal */}
      <Modal
        visible={voiceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVoiceModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Voice</Text>
            <Text style={styles.modalSubtitle}>
              Choose a voice for your AI agent
            </Text>
            <View style={styles.voiceList}>
              {VOICE_OPTIONS.map((voice) => {
                const selected = voice.id === voiceId;
                return (
                  <TouchableOpacity
                    key={voice.id}
                    style={[styles.voiceOption, selected && styles.voiceOptionSelected]}
                    activeOpacity={0.6}
                    onPress={() => selectVoice(voice.id)}
                  >
                    <View style={styles.voiceOptionLeft}>
                      <Text
                        style={[
                          styles.voiceOptionName,
                          selected && styles.voiceOptionNameSelected,
                        ]}
                      >
                        {voice.name}
                      </Text>
                      <Text style={styles.voiceOptionDesc}>{voice.description}</Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* System Prompt Editor Modal */}
      <Modal
        visible={promptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <SafeAreaView style={styles.promptModalContainer}>
          <View style={styles.promptModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setPromptDraft(systemPrompt);
                setPromptModalVisible(false);
              }}
            >
              <Text style={styles.promptModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.promptModalTitle}>System Prompt</Text>
            <TouchableOpacity onPress={saveSystemPrompt}>
              <Text style={styles.promptModalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promptModalDivider} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <TextInput
              style={styles.promptModalInput}
              value={promptDraft}
              onChangeText={setPromptDraft}
              multiline
              placeholder="Define how your AI agent should behave, respond, and handle calls..."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
              autoFocus
              selectionColor={colors.primary}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  notFound: {
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: fontSize.md,
  },

  // Navigation
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Agent Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  agentName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  headerDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  headerMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Sections
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },

  // Phone / Call Forwarding
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Forwarding actions
  forwardingActions: {
    padding: spacing.md,
  },
  forwardingDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  forwardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  forwardBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  disableBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disableBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // No phone
  noPhonePadding: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noPhoneText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  noPhoneSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Config rows
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 60,
  },
  configLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  configLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  configValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Greeting editing
  greetingInput: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    lineHeight: 20,
  },

  // Delete
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorSoft,
  },
  deleteText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },

  // Voice Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  voiceList: {
    gap: spacing.sm,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accentSoft,
  },
  voiceOptionLeft: {
    flex: 1,
  },
  voiceOptionName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  voiceOptionNameSelected: {
    fontWeight: '600',
  },
  voiceOptionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // System Prompt Modal
  promptModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  promptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  promptModalCancel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  promptModalTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  promptModalSave: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  promptModalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  promptModalInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    lineHeight: 24,
  },
});
