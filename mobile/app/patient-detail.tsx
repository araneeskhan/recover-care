import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { staffAPI } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../constants/Colors';
import Svg, { Circle } from 'react-native-svg';

const SEV_COLOR: Record<string, string> = { CRITICAL: '#E74C3C', HIGH: '#F2994A', MEDIUM: '#F1C40F', LOW: '#3498DB' };
const SEV_BG: Record<string, string> = { CRITICAL: '#FADBD8', HIGH: '#FDEBD0', MEDIUM: '#FEF9C3', LOW: '#D6EAF8' };

function RecoveryRing({ current, total, size = 90, color }: { current: number; total: number; size?: number; color: string }) {
  const sw = 8, r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - current / total)} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>DAY</Text>
        <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '700' }}>{current}</Text>
      </View>
    </View>
  );
}

export default function PatientDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'meds' | 'alerts'>('overview');

  const load = useCallback(async () => {
    try {
      const res = await staffAPI.getPatientDetail(patientId);
      setData(res.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to load patient');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={accentColor} /></View>;
  if (!data) return null;

  const { patient, checkIns, medications, alerts, appointments } = data;
  const latestCheckIn = checkIns[0];
  const activeAlerts = alerts.filter((a: any) => !a.isResolved);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={isDoctor ? ['#7F4A00', '#E67E22'] : ['#4A235A', '#9B59B6']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
            <Text style={styles.mrnText}>MRN {patient.mrn} · Age {patient.age}</Text>
            <Text style={styles.surgeryText}>{patient.surgeryType}</Text>
            <View style={styles.pillRow}>
              {patient.bloodType && <View style={styles.pill}><Text style={styles.pillText}>Blood: {patient.bloodType}</Text></View>}
              {patient.allergies && <View style={[styles.pill, { backgroundColor: '#FADBD8' }]}><Text style={[styles.pillText, { color: '#E74C3C' }]}>⚠ {patient.allergies}</Text></View>}
            </View>
          </View>
          <RecoveryRing current={patient.currentDay} total={patient.totalDays} color="rgba(255,255,255,0.9)" />
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Adherence', value: `${patient.medicationAdherence}%`, icon: 'medical-outline' },
            { label: 'Pain', value: latestCheckIn ? `${latestCheckIn.painLevel}/10` : '—', icon: 'pulse-outline' },
            { label: 'Temp', value: latestCheckIn?.temperature ? `${latestCheckIn.temperature}°C` : '—', icon: 'thermometer-outline' },
            { label: 'Active Alerts', value: activeAlerts.length, icon: 'warning-outline' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Ionicons name={s.icon as any} size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: accentColor }]}
          onPress={() => router.push({ pathname: '/staff-chat', params: { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}`, surgeryType: patient.surgeryType } })}
        >
          <Ionicons name="chatbubble-outline" size={16} color={accentColor} />
          <Text style={[styles.actionBtnText, { color: accentColor }]}>Message</Text>
        </TouchableOpacity>
        {isDoctor && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: accentColor }]}
            onPress={() => router.push({ pathname: '/prescribe-medication', params: { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}` } })}
          >
            <Ionicons name="add-circle-outline" size={16} color={accentColor} />
            <Text style={[styles.actionBtnText, { color: accentColor }]}>Prescribe</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: accentColor }]}
          onPress={() => router.push({ pathname: '/schedule-appointment', params: { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}` } })}
        >
          <Ionicons name="calendar-outline" size={16} color={accentColor} />
          <Text style={[styles.actionBtnText, { color: accentColor }]}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['overview', 'checkins', 'meds', 'alerts'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && { borderBottomColor: accentColor, borderBottomWidth: 2 }]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && { color: accentColor, fontWeight: FontWeight.bold }]}>
              {t === 'overview' ? 'Overview' : t === 'checkins' ? 'Check-ins' : t === 'meds' ? 'Meds' : 'Alerts'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {activeTab === 'overview' && (
          <View style={{ gap: 12, padding: Spacing.xl }}>
            {/* Contact */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Info</Text>
              {[
                { icon: 'call-outline', label: 'Phone', val: patient.phone ?? '—' },
                { icon: 'location-outline', label: 'Address', val: patient.address ?? '—' },
                { icon: 'person-outline', label: 'Emergency Contact', val: patient.emergencyContactName ?? '—' },
                { icon: 'call-outline', label: 'Emergency Phone', val: patient.emergencyContactPhone ?? '—' },
              ].map((r, i) => (
                <View key={i} style={styles.infoRow}>
                  <Ionicons name={r.icon as any} size={16} color={accentColor} style={{ marginRight: 10 }} />
                  <View><Text style={styles.infoLabel}>{r.label}</Text><Text style={styles.infoVal}>{r.val}</Text></View>
                </View>
              ))}
            </View>
            {/* Upcoming appointments */}
            {appointments.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Upcoming Appointments</Text>
                {appointments.filter((a: any) => new Date(a.dateTime) >= new Date()).slice(0, 3).map((a: any) => (
                  <View key={a.id} style={styles.apptRow}>
                    <Ionicons name="calendar" size={16} color={accentColor} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.apptTitle}>{a.title}</Text>
                      <Text style={styles.apptTime}>{new Date(a.dateTime).toLocaleDateString()} · {new Date(a.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {/* Care team */}
            {patient.careTeam?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Care Team</Text>
                {patient.careTeam.map((ct: any) => (
                  <View key={ct.id} style={styles.teamRow}>
                    <View style={[styles.teamAvatar, { backgroundColor: accentColor + '22' }]}>
                      <Text style={[styles.teamAvatarText, { color: accentColor }]}>{ct.staff.firstName[0]}{ct.staff.lastName[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.teamName}>{ct.staff.firstName} {ct.staff.lastName}</Text>
                      <Text style={styles.teamRole}>{ct.staff.staffRole} · {ct.staff.specialty}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'checkins' && (
          <View style={{ gap: 10, padding: Spacing.xl }}>
            {checkIns.length === 0 ? <Text style={styles.noData}>No check-ins yet</Text> :
              checkIns.map((c: any) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.checkInTop}>
                    <Text style={styles.checkInDate}>{new Date(c.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    <View style={[styles.painBadge, { backgroundColor: c.painLevel >= 7 ? '#FADBD8' : c.painLevel >= 4 ? '#FDEBD0' : '#D4EFDF' }]}>
                      <Text style={[styles.painText, { color: c.painLevel >= 7 ? '#E74C3C' : c.painLevel >= 4 ? '#F2994A' : '#27AE60' }]}>Pain {c.painLevel}/10</Text>
                    </View>
                  </View>
                  {c.temperature && <Text style={styles.checkInDetail}>🌡 {c.temperature}°C</Text>}
                  {c.symptoms?.length > 0 && <Text style={styles.checkInDetail}>Symptoms: {c.symptoms.join(', ')}</Text>}
                  {c.mood && <Text style={styles.checkInDetail}>Mood: {c.mood}</Text>}
                  {c.notes && <Text style={styles.checkInNotes}>{c.notes}</Text>}
                  {c.staffNotes && (
                    <View style={styles.staffNoteBox}>
                      <Ionicons name="clipboard" size={12} color={accentColor} />
                      <Text style={[styles.staffNoteText, { color: accentColor }]}>{c.staffNotes}</Text>
                    </View>
                  )}
                </View>
              ))
            }
          </View>
        )}

        {activeTab === 'meds' && (
          <View style={{ gap: 10, padding: Spacing.xl }}>
            {medications.length === 0 ? <Text style={styles.noData}>No medications</Text> :
              medications.map((m: any) => {
                const pct = m.totalDoses > 0 ? Math.round((m.takenDoses / m.totalDoses) * 100) : 0;
                return (
                  <View key={m.id} style={styles.card}>
                    <View style={styles.medTop}>
                      <View>
                        <Text style={styles.medName}>{m.name}</Text>
                        <Text style={styles.medDosage}>{m.dosage} · {m.frequency}</Text>
                      </View>
                      <View style={[styles.medStatus, { backgroundColor: m.isActive ? Colors.semantic.successLight : Colors.border.light }]}>
                        <Text style={[styles.medStatusText, { color: m.isActive ? Colors.semantic.success : Colors.text.tertiary }]}>{m.isActive ? 'Active' : 'Inactive'}</Text>
                      </View>
                    </View>
                    {m.instructions && <Text style={styles.medInstr}>{m.instructions}</Text>}
                    <View style={styles.adherenceRow}>
                      <Text style={styles.adherenceLabel}>Adherence: {pct}%</Text>
                      <Text style={styles.adherenceSub}>{m.takenDoses}/{m.totalDoses} doses</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? Colors.semantic.success : pct >= 50 ? Colors.semantic.warning : Colors.semantic.error }]} />
                    </View>
                    {isDoctor && (
                      <TouchableOpacity
                        style={[styles.editMedBtn, { borderColor: accentColor }]}
                        onPress={() => router.push({ pathname: '/prescribe-medication', params: { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}`, editMedId: m.id, editMedName: m.name, editMedDosage: m.dosage, editMedFreq: m.frequency } })}
                      >
                        <Ionicons name="create-outline" size={14} color={accentColor} />
                        <Text style={[styles.editMedText, { color: accentColor }]}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            }
          </View>
        )}

        {activeTab === 'alerts' && (
          <View style={{ gap: 10, padding: Spacing.xl }}>
            {alerts.length === 0 ? <Text style={styles.noData}>No alerts</Text> :
              alerts.map((a: any) => (
                <View key={a.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: SEV_COLOR[a.severity] }]}>
                  <View style={styles.alertTop}>
                    <View style={[styles.sevBadge, { backgroundColor: SEV_BG[a.severity] }]}>
                      <Text style={[styles.sevText, { color: SEV_COLOR[a.severity] }]}>{a.severity}</Text>
                    </View>
                    {a.isResolved
                      ? <View style={styles.resolvedBadge}><Ionicons name="checkmark-circle" size={14} color={Colors.semantic.success} /><Text style={styles.resolvedText}>Resolved</Text></View>
                      : <TouchableOpacity style={[styles.resolveBtn, { borderColor: accentColor }]} onPress={() => {
                          Alert.prompt('Resolve Alert', 'Add a resolution note (optional):', async (note) => {
                            try { await staffAPI.resolveAlert(a.id, note ?? undefined); load(); }
                            catch { Alert.alert('Error', 'Failed to resolve alert'); }
                          });
                        }}>
                          <Text style={[styles.resolveBtnText, { color: accentColor }]}>Resolve</Text>
                        </TouchableOpacity>
                    }
                  </View>
                  <Text style={styles.alertMsg}>{a.message.replace(/[🚨⚠️📋ℹ️]/g, '').trim()}</Text>
                  <Text style={styles.alertTime}>{new Date(a.createdAt).toLocaleString()}</Text>
                  {a.resolutionNote && <View style={styles.resNoteBox}><Text style={styles.resNoteText}>{a.resolutionNote}</Text></View>}
                </View>
              ))
            }
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  patientInfo: { flex: 1 },
  patientName: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  mrnText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  surgeryText: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, color: '#FFF', fontWeight: FontWeight.medium },
  statsStrip: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.sm, paddingVertical: 8 },
  statValue: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: 2 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },
  actionRow: { flexDirection: 'row', padding: Spacing.lg, gap: 8, backgroundColor: Colors.background.card, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 8 },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.background.card, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  body: { flex: 1 },
  card: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 14, ...Shadow.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  infoLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  infoVal: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: FontWeight.medium },
  apptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  apptTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text.primary },
  apptTime: { fontSize: FontSize.xs, color: Colors.text.secondary },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  teamAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  teamAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  teamName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text.primary },
  teamRole: { fontSize: FontSize.xs, color: Colors.text.secondary },
  checkInTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  checkInDate: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  painBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  painText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  checkInDetail: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 3 },
  checkInNotes: { fontSize: FontSize.sm, color: Colors.text.secondary, fontStyle: 'italic', marginTop: 4 },
  staffNoteBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Colors.semantic.infoLight, borderRadius: 6, padding: 8, marginTop: 6 },
  staffNoteText: { fontSize: FontSize.xs, flex: 1 },
  noData: { textAlign: 'center', color: Colors.text.secondary, marginTop: 40, fontSize: FontSize.md },
  medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  medName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text.primary },
  medDosage: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  medStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  medStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  medInstr: { fontSize: FontSize.xs, color: Colors.text.secondary, fontStyle: 'italic', marginBottom: 8 },
  adherenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  adherenceLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text.primary },
  adherenceSub: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  progressBg: { height: 4, backgroundColor: Colors.border.light, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  editMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingVertical: 5, marginTop: 10 },
  editMedText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sevBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sevText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resolvedText: { fontSize: FontSize.xs, color: Colors.semantic.success },
  resolveBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  resolveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  alertMsg: { fontSize: FontSize.sm, color: Colors.text.primary },
  alertTime: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 4 },
  resNoteBox: { backgroundColor: Colors.semantic.successLight, borderRadius: 6, padding: 8, marginTop: 8 },
  resNoteText: { fontSize: FontSize.xs, color: Colors.semantic.success },
});
