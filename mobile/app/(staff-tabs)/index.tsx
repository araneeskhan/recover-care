import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { staffAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: Colors.semantic.error,
  HIGH: Colors.semantic.warning,
  MEDIUM: '#F1C40F',
  LOW: Colors.semantic.info,
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: Colors.semantic.errorLight,
  HIGH: Colors.semantic.warningLight,
  MEDIUM: '#FEF9C3',
  LOW: Colors.semantic.infoLight,
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const load = useCallback(async () => {
    try {
      const res = await staffAPI.getDashboard();
      setData(res.data);
    } catch (e) {
      console.log('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  const summary = data?.summary ?? { totalPatients: 0, criticalAlerts: 0, highAlerts: 0, unreadMessages: 0, todayCheckIns: 0 };
  const staff = data?.staff ?? { firstName: user?.firstName, role: user?.role, specialty: '' };
  const recentAlerts = data?.recentAlerts ?? [];
  const patients = data?.patients ?? [];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
    >
      {/* Header */}
      <LinearGradient
        colors={isDoctor ? ['#7F4A00', '#E67E22'] : ['#4A235A', '#9B59B6']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.nameText}>{isDoctor ? 'Dr. ' : ''}{staff.firstName}</Text>
            <View style={styles.rolePill}>
              <Ionicons name={isDoctor ? 'briefcase' : 'medical'} size={12} color="#FFF" />
              <Text style={styles.roleText}>{isDoctor ? 'Physician' : 'Nurse'} · {staff.specialty}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.msgBtn} onPress={() => router.push('/(staff-tabs)/messages')}>
            <Ionicons name="chatbubbles-outline" size={24} color="#FFF" />
            {summary.unreadMessages > 0 && (
              <View style={styles.msgDot}>
                <Text style={styles.msgDotText}>{summary.unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stat row */}
        <View style={styles.statRow}>
          {[
            { label: 'Patients', value: summary.totalPatients, icon: 'people-outline' },
            { label: 'Check-ins Today', value: summary.todayCheckIns, icon: 'clipboard-outline' },
            { label: 'Critical', value: summary.criticalAlerts, icon: 'warning-outline', danger: summary.criticalAlerts > 0 },
            { label: 'High', value: summary.highAlerts, icon: 'alert-circle-outline', warn: summary.highAlerts > 0 },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, s.danger && styles.statDanger, s.warn && !s.danger && styles.statWarn]}>
              <Ionicons name={s.icon as any} size={18} color={s.danger ? Colors.semantic.error : s.warn ? Colors.semantic.warning : 'rgba(255,255,255,0.8)'} />
              <Text style={[styles.statValue, (s.danger || s.warn) && { color: '#FFF' }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              <TouchableOpacity onPress={() => router.push('/(staff-tabs)/alerts')}>
                <Text style={[styles.sectionLink, { color: accentColor }]}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentAlerts.slice(0, 4).map((alert: any) => (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertCard, { borderLeftColor: SEVERITY_COLOR[alert.severity] }]}
                onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: alert.patientId } })}
              >
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_BG[alert.severity] }]}>
                  <Ionicons name="warning" size={14} color={SEVERITY_COLOR[alert.severity]} />
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertPatient}>
                    {alert.patient?.firstName} {alert.patient?.lastName}
                    <Text style={[styles.alertSev, { color: SEVERITY_COLOR[alert.severity] }]}> · {alert.severity}</Text>
                  </Text>
                  <Text style={styles.alertMsg} numberOfLines={1}>{alert.message.replace(/[🚨⚠️📋ℹ️]/g, '').trim()}</Text>
                  <Text style={styles.alertTime}>{new Date(alert.createdAt).toLocaleString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.neutral.mediumGray} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Patient Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Patients</Text>
            <TouchableOpacity onPress={() => router.push('/(staff-tabs)/patients')}>
              <Text style={[styles.sectionLink, { color: accentColor }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {patients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color={Colors.neutral.mediumGray} />
              <Text style={styles.emptyText}>No patients assigned yet</Text>
            </View>
          ) : (
            patients.slice(0, 5).map((p: any) => (
              <TouchableOpacity
                key={p.id}
                style={styles.patientCard}
                onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: p.id } })}
              >
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{p.firstName[0]}{p.lastName[0]}</Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{p.firstName} {p.lastName}</Text>
                  <Text style={styles.patientSub}>{p.surgeryType} · Day {p.currentDay}/{p.totalDays}</Text>
                  {p.latestPain !== null && (
                    <Text style={styles.patientVitals}>Pain: {p.latestPain}/10{p.latestTemp ? ` · Temp: ${p.latestTemp}°C` : ''}</Text>
                  )}
                </View>
                {p.topAlertSeverity && (
                  <View style={[styles.alertBadge, { backgroundColor: SEVERITY_BG[p.topAlertSeverity] }]}>
                    <Text style={[styles.alertBadgeText, { color: SEVERITY_COLOR[p.topAlertSeverity] }]}>
                      {p.topAlertSeverity}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={Colors.neutral.mediumGray} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {[
              { label: 'All Alerts', icon: 'warning-outline', route: '/(staff-tabs)/alerts', color: Colors.semantic.error },
              { label: 'Patients', icon: 'people-outline', route: '/(staff-tabs)/patients', color: accentColor },
              { label: 'Messages', icon: 'chatbubbles-outline', route: '/(staff-tabs)/messages', color: Colors.primary.teal },
              { label: 'Profile', icon: 'person-circle-outline', route: '/(staff-tabs)/profile', color: Colors.neutral.darkGray },
            ].map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickCard}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.color + '18' }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greetingText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  nameText: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginVertical: 2 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  roleText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xs },
  msgBtn: { padding: 10, position: 'relative' },
  msgDot: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.semantic.error, justifyContent: 'center', alignItems: 'center' },
  msgDotText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.sm, padding: 10, alignItems: 'center', gap: 3 },
  statDanger: { backgroundColor: Colors.semantic.error + 'CC' },
  statWarn: { backgroundColor: Colors.semantic.warning + 'CC' },
  statValue: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9, textAlign: 'center' },
  body: { padding: Spacing.xl },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text.primary },
  sectionLink: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8, borderLeftWidth: 4, ...Shadow.sm },
  severityDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  alertBody: { flex: 1 },
  alertPatient: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  alertSev: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  alertMsg: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  alertTime: { fontSize: 10, color: Colors.text.tertiary, marginTop: 2 },
  patientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  patientAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary.navy, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  patientAvatarText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  patientInfo: { flex: 1 },
  patientName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  patientSub: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  patientVitals: { fontSize: FontSize.xs, color: Colors.primary.teal, marginTop: 2 },
  alertBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6 },
  alertBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  emptyCard: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.md },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 14, alignItems: 'center', gap: 6, ...Shadow.sm },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, fontWeight: FontWeight.medium, textAlign: 'center' },
});
