import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { agentsApi } from '../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgentKnowledge'>;
  route: { params: { agentId: string } };
};

interface FAQPair {
  question: string;
  answer: string;
}

interface KnowledgeData {
  businessName: string;
  services: string;
  faqs: FAQPair[];
  customInstructions: string;
}

const MAX_FAQS = 10;

function storageKey(agentId: string) {
  return `@holdplease_knowledge_${agentId}`;
}

function emptyKnowledge(): KnowledgeData {
  return {
    businessName: '',
    services: '',
    faqs: [{ question: '', answer: '' }],
    customInstructions: '',
  };
}

function assemblePrompt(agentName: string, knowledge: KnowledgeData): string {
  const { businessName, services, faqs, customInstructions } = knowledge;

  const lines: string[] = [];

  const nameDisplay = businessName.trim() || 'the business';
  lines.push(
    `You are ${agentName}, a professional AI voice assistant for ${nameDisplay}.`
  );

  if (services.trim()) {
    lines.push('');
    lines.push('About the business:');
    lines.push(services.trim());
  }

  const validFaqs = faqs.filter(
    (f) => f.question.trim() && f.answer.trim()
  );
  if (validFaqs.length > 0) {
    lines.push('');
    lines.push('Frequently asked questions:');
    for (const faq of validFaqs) {
      lines.push(`Q: ${faq.question.trim()}`);
      lines.push(`A: ${faq.answer.trim()}`);
    }
  }

  if (customInstructions.trim()) {
    lines.push('');
    lines.push('Additional instructions:');
    lines.push(customInstructions.trim());
  }

  lines.push('');
  lines.push('Key responsibilities:');
  lines.push('- Greet callers warmly and professionally');
  lines.push("- Collect the caller's name and phone number");
  lines.push(
    '- Understand their needs and answer questions using the knowledge above'
  );
  lines.push('- Schedule appointments or callbacks as appropriate');
  lines.push(
    '- Take detailed messages when the business owner is unavailable'
  );

  lines.push('');
  lines.push(
    'Tone: Professional, friendly, and helpful. Be concise and ask one question at a time.'
  );

  lines.push('');
  lines.push(
    "Important: Never make up information. If you don't know something, let the caller know the business owner will follow up."
  );

  return lines.join('\n');
}

export default function AgentKnowledgeScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { agentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [knowledge, setKnowledge] = useState<KnowledgeData>(emptyKnowledge());

  const initialRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentData, storedRaw] = await Promise.all([
          agentsApi.get(agentId),
          AsyncStorage.getItem(storageKey(agentId)),
        ]);

        if (cancelled) return;

        setAgentName(agentData.name || '');

        if (storedRaw) {
          const parsed = JSON.parse(storedRaw) as KnowledgeData;
          // Ensure faqs array has at least one entry
          if (!parsed.faqs || parsed.faqs.length === 0) {
            parsed.faqs = [{ question: '', answer: '' }];
          }
          setKnowledge(parsed);
          initialRef.current = storedRaw;
        } else {
          // Pre-fill business name from agent data if available
          const prefilled = emptyKnowledge();
          if (agentData.business_name) {
            prefilled.businessName = agentData.business_name;
          }
          setKnowledge(prefilled);
          initialRef.current = JSON.stringify(prefilled);
        }
      } catch (err) {
        console.warn('Failed to load knowledge data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const updateField = useCallback(
    <K extends keyof KnowledgeData>(field: K, value: KnowledgeData[K]) => {
      setKnowledge((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    []
  );

  const updateFAQ = useCallback(
    (index: number, field: 'question' | 'answer', value: string) => {
      setKnowledge((prev) => {
        const faqs = [...prev.faqs];
        faqs[index] = { ...faqs[index], [field]: value };
        return { ...prev, faqs };
      });
      setHasChanges(true);
    },
    []
  );

  const addFAQ = useCallback(() => {
    setKnowledge((prev) => {
      if (prev.faqs.length >= MAX_FAQS) return prev;
      return { ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] };
    });
    setHasChanges(true);
  }, []);

  const removeFAQ = useCallback(
    (index: number) => {
      setKnowledge((prev) => {
        const faqs = prev.faqs.filter((_, i) => i !== index);
        // Always keep at least one
        if (faqs.length === 0) faqs.push({ question: '', answer: '' });
        return { ...prev, faqs };
      });
      setHasChanges(true);
    },
    []
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      // 1. Persist to AsyncStorage
      await AsyncStorage.setItem(
        storageKey(agentId),
        JSON.stringify(knowledge)
      );

      // 2. Assemble and PATCH system prompt
      const prompt = assemblePrompt(agentName, knowledge);
      await agentsApi.update(agentId, { system_prompt: prompt });

      setHasChanges(false);
      initialRef.current = JSON.stringify(knowledge);

      Alert.alert('Saved', 'Agent knowledge has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.warn('Failed to save knowledge:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [knowledge, agentName, agentId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Agent Knowledge</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Agent Knowledge</Text>
        <TouchableOpacity
          onPress={save}
          disabled={!hasChanges || saving}
          activeOpacity={0.6}
        >
          <Text
            style={[
              s.saveButton,
              (!hasChanges || saving) && s.saveButtonDisabled,
            ]}
          >
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Business Name */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>BUSINESS NAME</Text>
            <View style={s.card}>
              <TextInput
                style={s.input}
                value={knowledge.businessName}
                onChangeText={(v) => updateField('businessName', v)}
                placeholder="Your business name"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Services & Products */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>SERVICES & PRODUCTS</Text>
            <View style={s.card}>
              <TextInput
                style={[s.input, s.inputMultiline]}
                value={knowledge.services}
                onChangeText={(v) => updateField('services', v)}
                placeholder="e.g. We offer residential plumbing, emergency repairs, and water heater installation"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Frequently Asked Questions */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
            {knowledge.faqs.map((faq, index) => (
              <View key={index} style={s.faqCard}>
                <View style={s.faqHeader}>
                  <Text style={s.faqIndex}>Q{index + 1}</Text>
                  {knowledge.faqs.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeFAQ(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={22}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={s.faqInput}
                  value={faq.question}
                  onChangeText={(v) => updateFAQ(index, 'question', v)}
                  placeholder="Question"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  returnKeyType="next"
                />
                <View style={s.faqSep} />
                <TextInput
                  style={[s.faqInput, s.faqAnswerInput]}
                  value={faq.answer}
                  onChangeText={(v) => updateFAQ(index, 'answer', v)}
                  placeholder="Answer"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}

            {knowledge.faqs.length < MAX_FAQS && (
              <TouchableOpacity
                style={s.addFaqBtn}
                onPress={addFAQ}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={s.addFaqText}>Add Question</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Custom Instructions */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>CUSTOM INSTRUCTIONS</Text>
            <View style={s.card}>
              <TextInput
                style={[s.input, s.inputMultilineLg]}
                value={knowledge.customInstructions}
                onChangeText={(v) => updateField('customInstructions', v)}
                placeholder="e.g. Always ask for the caller's address. We don't service areas outside Miami-Dade county."
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    saveButton: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.primary,
    },
    saveButtonDisabled: {
      opacity: 0.35,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Scroll
    scroll: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    // Section
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },

    // Inputs
    input: {
      fontSize: fontSize.md,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    inputMultiline: {
      minHeight: 72,
      lineHeight: 22,
    },
    inputMultilineLg: {
      minHeight: 96,
      lineHeight: 22,
    },

    // FAQ
    faqCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 10,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: 12,
      paddingBottom: 4,
    },
    faqIndex: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    faqInput: {
      fontSize: fontSize.md,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    faqAnswerInput: {
      minHeight: 52,
      lineHeight: 22,
    },
    faqSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.md,
    },

    // Add FAQ button
    addFaqBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      marginTop: 2,
    },
    addFaqText: {
      fontSize: fontSize.sm,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });
