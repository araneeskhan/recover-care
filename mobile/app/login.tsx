import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

const DEMO_ACCOUNTS = [
  { label: 'Patient', sublabel: 'Sarah Chen', email: 'sarah.chen@email.com', password: 'password123', icon: 'person', color: Colors.primary.teal },
  { label: 'Nurse', sublabel: 'Émilie Laurent', email: 'emilie.laurent@mercygeneral.com', password: 'password123', icon: 'medical', color: '#9B59B6' },
  { label: 'Doctor', sublabel: 'Dr. Patel', email: 'dr.patel@mercygeneral.com', password: 'password123', icon: 'briefcase', color: '#E67E22' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || 'Unable to connect to server. Make sure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemo = (idx: number) => {
    setSelectedDemo(idx);
    setEmail(DEMO_ACCOUNTS[idx].email);
    setPassword(DEMO_ACCOUNTS[idx].password);
  };

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.primary.navy]}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="heart-circle" size={64} color={Colors.primary.teal} />
            </View>
            <Text style={styles.appName}>RecoverCare</Text>
            <Text style={styles.tagline}>Your recovery, continuously monitored</Text>
          </View>

          {/* Demo role quick-select */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Quick Demo Login</Text>
            <View style={styles.demoRow}>
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.demoCard, selectedDemo === idx && { borderColor: acc.color, borderWidth: 2 }]}
                  onPress={() => selectDemo(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.demoIcon, { backgroundColor: acc.color + '22' }]}>
                    <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                  </View>
                  <Text style={[styles.demoCardLabel, selectedDemo === idx && { color: acc.color }]}>{acc.label}</Text>
                  <Text style={styles.demoCardSub}>{acc.sublabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.neutral.mediumGray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.neutral.mediumGray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.mediumGray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.neutral.mediumGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.neutral.mediumGray} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary.teal, Colors.primary.tealLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {isLoading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.loginButtonText}>Sign In</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.primary.teal} />
            <Text style={styles.footerText}>End-to-end encrypted · HIPAA compliant</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xxxl, paddingVertical: 40 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(26,158,143,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  appName: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.neutral.white, letterSpacing: -0.5 },
  tagline: { fontSize: FontSize.md, color: Colors.neutral.mediumGray, marginTop: Spacing.sm },
  demoSection: { marginBottom: 28 },
  demoLabel: { color: Colors.neutral.mediumGray, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center', marginBottom: 12 },
  demoRow: { flexDirection: 'row', gap: 10 },
  demoCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.md,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  demoIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  demoCardLabel: { color: Colors.neutral.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  demoCardSub: { color: Colors.neutral.mediumGray, fontSize: 10, marginTop: 2, textAlign: 'center' },
  formSection: { gap: Spacing.lg },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.xs,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: Spacing.md },
  input: { flex: 1, color: Colors.neutral.white, fontSize: FontSize.md, paddingVertical: Spacing.md },
  loginButton: { marginTop: Spacing.sm, borderRadius: BorderRadius.md, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonGradient: { paddingVertical: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md },
  loginButtonText: { color: Colors.neutral.white, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: 40 },
  footerText: { color: Colors.neutral.mediumGray, fontSize: FontSize.sm },
});
