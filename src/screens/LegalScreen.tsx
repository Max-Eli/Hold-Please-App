import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: any;
  route: { params: { type: 'terms' | 'privacy' } };
};

type Section = {
  heading: string;
  body: string;
};

const TERMS_SECTIONS: Section[] = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By using Hold Please, you agree to these terms. If you do not agree, do not use the service.',
  },
  {
    heading: '2. Description of Service',
    body: 'Hold Please provides AI-powered voice agent services for businesses. Our agents handle inbound calls, collect information, and assist callers on your behalf.',
  },
  {
    heading: '3. Account Responsibilities',
    body: 'You are responsible for maintaining the security of your account credentials. You must provide accurate business information. You are responsible for all activity under your account.',
  },
  {
    heading: '4. Subscription & Billing',
    body: 'Free tier includes 30 minutes/month. Pro tier ($49/month) includes 500 minutes/month. Subscriptions auto-renew unless cancelled. Refunds are handled on a case-by-case basis.',
  },
  {
    heading: '5. Acceptable Use',
    body: 'You may not use Hold Please for illegal activities, harassment, spam calls, or any purpose that violates applicable laws.',
  },
  {
    heading: '6. Data & Recordings',
    body: 'Call recordings and transcripts are stored securely. You are responsible for compliance with local call recording laws and obtaining necessary consent.',
  },
  {
    heading: '7. Limitation of Liability',
    body: 'Hold Please is provided "as is." We are not liable for missed calls, incorrect AI responses, or service interruptions.',
  },
  {
    heading: '8. Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms.',
  },
  {
    heading: '9. Contact',
    body: 'Questions about these terms? Contact us at legal@holdplease.ai',
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    heading: '1. Information We Collect',
    body: 'Account information (name, email, business details), call data (recordings, transcripts, caller phone numbers), usage analytics, device information.',
  },
  {
    heading: '2. How We Use Your Data',
    body: 'To provide and improve our AI voice agent services, to process and display call analytics, to send service notifications, to provide customer support.',
  },
  {
    heading: '3. Data Storage & Security',
    body: 'All data is encrypted in transit and at rest. We use Supabase for authentication and data storage. Call recordings are stored securely and accessible only to your account.',
  },
  {
    heading: '4. Third-Party Services',
    body: 'We use Twilio for telephony services, OpenAI for AI voice processing, Supabase for authentication and database, Expo for push notifications.',
  },
  {
    heading: '5. Your Rights',
    body: 'You can request access to your personal data, request deletion of your account and associated data, opt out of non-essential communications, export your call data.',
  },
  {
    heading: '6. Data Retention',
    body: 'Call data is retained for the duration of your account. Upon account deletion, all data is removed within 30 days.',
  },
  {
    heading: '7. Children\'s Privacy',
    body: 'Hold Please is not intended for users under 18.',
  },
  {
    heading: '8. Changes to This Policy',
    body: 'We may update this policy periodically. Continued use constitutes acceptance.',
  },
  {
    heading: '9. Contact',
    body: 'Privacy questions? Contact us at privacy@holdplease.ai',
  },
];

export default function LegalScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isTerms = route.params.type === 'terms';

  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: March 10, 2026</Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
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

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
    },
    backButton: {
      width: 32,
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 32,
    },

    /* Scroll content */
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },

    /* Last updated */
    lastUpdated: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },

    /* Sections */
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeading: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    sectionBody: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
