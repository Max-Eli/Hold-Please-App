import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How do I create an AI agent?',
        answer:
          "Go to the Agent tab and tap 'Create Agent'. Choose your business type, name your agent, and set a greeting message. Your agent will be ready to take calls immediately.",
      },
      {
        question: 'How does call forwarding work?',
        answer:
          "Once your agent has a phone number, you can forward your business line to it. Go to the Agent tab, tap your agent's phone number section, and use the 'Enable Forwarding' button. This dials *72 followed by your agent's number to activate forwarding on your carrier.",
      },
    ],
  },
  {
    title: 'Phone Numbers',
    items: [
      {
        question: "Why doesn't my agent have a phone number?",
        answer:
          "Phone numbers are automatically assigned from your Twilio account. Make sure your Twilio credentials are configured correctly in the app settings. You can also tap 'Assign Number' on the Agent tab to retry.",
      },
      {
        question: 'Can I use my own phone number?',
        answer:
          "Yes! You can forward your existing business number to your agent's assigned number using call forwarding. Your customers will still call your regular number.",
      },
    ],
  },
  {
    title: 'Calls & Leads',
    items: [
      {
        question: 'Where can I see my call history?',
        answer:
          'Go to the Calls tab to see all inbound and outbound calls handled by your agent, including duration, transcripts, and caller sentiment.',
      },
      {
        question: 'How does lead extraction work?',
        answer:
          'Lead extraction (Pro feature) automatically identifies potential leads from your calls. It flags callers who need follow-up based on missed calls, negative sentiment, or short call duration. View leads from the Dashboard or the Leads screen.',
      },
    ],
  },
  {
    title: 'Subscription',
    items: [
      {
        question: "What's included in the Free plan?",
        answer:
          'The Free plan includes basic call handling, call logs, dashboard analytics, push notifications, and pre-built system prompts with 30 minutes per month.',
      },
      {
        question: "What's included in Pro?",
        answer:
          'Pro ($49/month) includes everything in Free plus: agent knowledge base editing, business hours scheduling, appointment settings, AI custom prompts, lead extraction, and 500 minutes per month.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        question: "My agent isn't receiving calls",
        answer:
          "Check that: (1) Your agent is toggled to 'Live' on the Agent tab, (2) A phone number is assigned, (3) Call forwarding is enabled if you're forwarding from another number. If issues persist, contact support.",
      },
      {
        question: "How do I change my agent's voice?",
        answer:
          "Go to the Agent tab and tap the 'Voice' setting. Choose from 6 different voice options including Alloy, Echo, Fable, Onyx, Nova, and Shimmer.",
      },
    ],
  },
];

export default function HelpCenterScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_DATA.map((section, sectionIndex) => (
          <View key={section.title} style={sectionIndex > 0 ? styles.sectionSpacing : undefined}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, itemIndex) => {
                const key = `${sectionIndex}-${itemIndex}`;
                const isExpanded = expandedKeys.has(key);
                const isLast = itemIndex === section.items.length - 1;

                return (
                  <View key={key}>
                    <TouchableOpacity
                      style={styles.questionRow}
                      activeOpacity={0.6}
                      onPress={() => toggleItem(key)}
                    >
                      <Text style={styles.questionText}>{item.question}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.answerContainer}>
                        <View style={styles.answerSeparator} />
                        <Text style={styles.answerText}>{item.answer}</Text>
                      </View>
                    )}

                    {!isLast && <View style={styles.itemSeparator} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
    },
    headerTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    sectionSpacing: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
    },
    questionText: {
      fontSize: fontSize.md,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
      marginRight: spacing.sm,
    },
    answerContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: 14,
    },
    answerSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    answerText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    itemSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.md,
    },
  });
