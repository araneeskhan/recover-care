import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { staffAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';
import { useTheme } from '../../constants/Colors';

export default function StaffProfileScreen() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';
  const gradColors: [string, string] = isDoctor ? ['#7F4A00', '#E67E22'] : ['#4A235A', '#9B59B6'];

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    staffAPI.getProfile().then(r => setProfile(r.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const patientCount = profile?.assignments?.length ?? 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradColors} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name={isDoctor ? 'briefcase' : 'medical'} size={12} color="#FFF" />
            <Text style={styles.roleText}>{isDoctor ? 'Physician' : 'Nurse'}</Text>
          </View>
        </View>
        <Text style={styles.name}>{isDoctor ? 'Dr. ' : ''}{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.specialty}>{profile?.specialty ?? ''}</Text>
        {profile?.department && <Text style={styles.department}>{profile.department}</Text>}
      </LinearGradient>

      <View style={styles.body}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Patients', value: patientCount, icon: 'people-outline' },
            { label: 'Role', value: isDoctor ? 'Doctor' : 'Nurse', icon: isDoctor ? 'briefcase-outline' : 'medical-outline' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={22} color={accentColor} />
              <Text style={[styles.statValue, { color: accentColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Info</Text>
          {[
            { icon: 'mail-outline', label: 'Email', value: profile?.email ?? user?.email ?? '—' },
            { icon: 'phone-portrait-outline', label: 'Phone', value: profile?.phone ?? '—' },
            { icon: 'ribbon-outline', label: 'Specialty', value: profile?.specialty ?? '—' },
            { icon: 'business-outline', label: 'Department', value: profile?.department ?? '—' },
            { icon: 'card-outline', label: 'License #', value: profile?.licenseNumber ?? '—' },
          ].map((row, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name={row.icon as any} size={18} color={accentColor} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={20} color={accentColor} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: Colors.border.medium, true: accentColor }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.semantic.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>RecoverCare v2.0 · HIPAA Compliant</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 60, paddingBottom: 32, alignItems: 'center', paddingHorizontal: Spacing.xl },
  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: FontWeight.bold },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  name: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  specialty: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.md, marginTop: 4 },
  department: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm, marginTop: 2 },
  body: { padding: Spacing.xl },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', gap: 4, ...Shadow.sm },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, color: Colors.text.secondary },
  section: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: 16, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  infoIcon: { marginRight: 12 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  infoValue: { fontSize: FontSize.md, color: Colors.text.primary, fontWeight: FontWeight.medium },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: FontSize.md, color: Colors.text.primary },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.semantic.errorLight, borderRadius: BorderRadius.md, padding: 14, marginBottom: 16 },
  signOutText: { fontSize: FontSize.md, color: Colors.semantic.error, fontWeight: FontWeight.semibold },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 32 },
});
