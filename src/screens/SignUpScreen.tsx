import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Input from '../components/Input';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, BusinessType } from '../types';
import { useAuth } from '../context/AuthContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

const businessTypes: { value: BusinessType; label: string; icon: string }[] = [
  { value: 'real_estate', label: 'Real Estate', icon: 'home-outline' },
  { value: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { value: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { value: 'mobile_carwash', label: 'Mobile Carwash', icon: 'car-outline' },
  { value: 'hvac', label: 'HVAC', icon: 'thermometer-outline' },
  { value: 'landscaping', label: 'Landscaping', icon: 'leaf-outline' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { value: 'general', label: 'Other', icon: 'briefcase-outline' },
];

export default function SignUpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setStep(2);
  };

  const handleSignUp = async () => {
    if (!businessName || !businessType) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({
        fullName,
        email,
        password,
        businessName,
        businessType,
      });
      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check Your Email',
          'We sent a confirmation link to your email. Please tap it to activate your account, then come back and sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Progress bar */}
          <View style={styles.progress}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, step === 2 && styles.barActive]} />
          </View>

          {step === 1 ? (
            <>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Start building AI voice agents for your business
              </Text>
              <Input label="Full Name" placeholder="John Smith" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
              <Input label="Email" placeholder="you@business.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Input label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry />
              <Button title="Continue" onPress={handleNext} style={{ marginTop: spacing.sm }} />
            </>
          ) : (
            <>
              <Text style={styles.title}>About your business</Text>
              <Text style={styles.subtitle}>This helps us customize your voice agent</Text>
              <Input label="Business Name" placeholder="Smith's Plumbing LLC" value={businessName} onChangeText={setBusinessName} />
              <Text style={styles.typeLabel}>Business Type</Text>
              <View style={styles.typeGrid}>
                {businessTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeCard, businessType === type.value && styles.typeCardActive]}
                    onPress={() => setBusinessType(type.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={22}
                      color={businessType === type.value ? colors.primaryLight : colors.textSecondary}
                    />
                    <Text style={[styles.typeText, businessType === type.value && styles.typeTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Create Account" onPress={handleSignUp} loading={loading} style={{ marginTop: spacing.lg }} />
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
  back: { marginTop: spacing.md, marginBottom: spacing.lg },
  progress: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  bar: { height: 3, flex: 1, borderRadius: 2, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.primary },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl },
  typeLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  typeTextActive: { color: colors.primaryLight },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.lg },
  footerText: { color: colors.textSecondary, fontSize: fontSize.sm },
  footerLink: { color: colors.primaryLight, fontSize: fontSize.sm, fontWeight: '600' },
});
