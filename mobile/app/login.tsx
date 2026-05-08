import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('sarah.chen@email.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || 'Unable to connect to server. Make sure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary.navy, Colors.primary.navyLight, Colors.primary.navy]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart-circle" size={64} color={Colors.primary.teal} />
          </View>
          <Text style={styles.appName}>RecoverCare</Text>
          <Text style={styles.tagline}>Your recovery, continuously monitored</Text>
        </View>

        {/* Login Form */}
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
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.neutral.mediumGray}
              />
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
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.demoHint}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary.tealLight} />
            <Text style={styles.demoHintText}>
              Demo: ---
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.primary.teal} />
          <Text style={styles.footerText}>End-to-end encrypted • HIPAA compliant</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 158, 143, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.neutral.mediumGray,
    marginTop: Spacing.sm,
  },
  formSection: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    color: Colors.neutral.white,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  loginButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  loginButtonText: {
    color: Colors.neutral.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  demoHintText: {
    color: Colors.primary.tealLight,
    fontSize: FontSize.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 48,
  },
  footerText: {
    color: Colors.neutral.mediumGray,
    fontSize: FontSize.sm,
  },
});
