import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadow, FontSize, FontWeight, BorderRadius } from '../constants/Colors';
import { patientAPI } from '../services/api';
import Svg, { Circle } from 'react-native-svg';

function MiniRing({ value, max, size = 48, color = Colors.primary.teal }: { value: number; max: number; size?: number; color?: string }) {
  const sw = 5, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 12, fontWeight: '700', color }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

const DEMO_REPORT = {
  patient: { firstName: 'Sarah', lastName: 'Chen', mrn: '4729-883', age: 42, surgeryType: 'Laparoscopic Cholecystectomy', surgeryDate: '2026-05-02', hospital: 'Mercy General', bloodType: 'A+', allergies: 'Penicillin' },
  recovery: { currentDay: 11, totalDays: 14, daysRemaining: 3 },
  vitalsTimeline: [
    { date: '2026-05-03', painLevel: 6, temperature: 37.4, mood: 'fair', symptoms: ['Fatigue', 'Swelling'] },
    { date: '2026-05-04', painLevel: 5, temperature: 37.2, mood: 'fair', symptoms: ['Fatigue', 'Swelling'] },
    { date: '2026-05-05', painLevel: 4, temperature: 37.0, mood: 'good', symptoms: ['Fatigue'] },
    { date: '2026-05-06', painLevel: 3, temperature: 36.9, mood: 'good', symptoms: ['Fatigue'] },
  ],
  medicationAdherence: { totalPrescribed: 65, totalTaken: 25, adherenceRate: 38, medications: [
    { name: 'Amoxicillin', dosage: '500 mg', totalDoses: 21, takenDoses: 8, isActive: true },
    { name: 'Ibuprofen', dosage: '400 mg', totalDoses: 30, takenDoses: 12, isActive: true },
    { name: 'Pantoprazole', dosage: '40 mg', totalDoses: 14, takenDoses: 5, isActive: true },
  ]},
  checkInStreak: 4, totalCheckIns: 4,
  alerts: { total: 3, resolved: 2, active: 1, bySeverity: { critical: 0, high: 1, medium: 1, low: 1 } },
  careTeam: [{ name: 'Aarav Patel', role: 'SURGEON', specialty: 'General Surgery' }, { name: 'Émilie Laurent', role: 'NURSE', specialty: 'Post-op Care' }],
  generatedAt: new Date().toISOString(),
};

export default function HealthReportScreen() {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try { const r = await patientAPI.getReport(); setReport(r.data); }
      catch { setReport(DEMO_REPORT); }
    })();
  }, []);

  const handleShare = async () => {
    if (!report) return;
    const p = report.patient;
    const text = `RecoverCare Recovery Report\n${p.firstName} ${p.lastName} (MRN: ${p.mrn})\nSurgery: ${p.surgeryType}\nDay ${report.recovery.currentDay} of ${report.recovery.totalDays}\nMedication Adherence: ${report.medicationAdherence.adherenceRate}%\nCheck-ins: ${report.totalCheckIns}\nGenerated: ${new Date(report.generatedAt).toLocaleDateString()}`;
    try { await Share.share({ message: text }); } catch {}
  };

  if (!report) return <View style={st.container}><Text style={{ color: Colors.text.secondary, textAlign: 'center', marginTop: 100 }}>Loading report...</Text></View>;

  const p = report.patient;
  const r = report.recovery;
  const vt = report.vitalsTimeline;
  const ma = report.medicationAdherence;

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Health Report</Text>
        <TouchableOpacity style={st.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={Colors.primary.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Patient Info Banner */}
        <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={st.banner}>
          <View style={st.bannerRow}>
            <View style={st.bannerAvatar}><Text style={st.bannerAvatarText}>{p.firstName[0]}{p.lastName[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.bannerName}>{p.firstName} {p.lastName}</Text>
              <Text style={st.bannerMeta}>MRN {p.mrn} · Age {p.age}</Text>
            </View>
          </View>
          <View style={st.bannerInfo}>
            <View style={st.bannerInfoItem}><Text style={st.bannerInfoLabel}>SURGERY</Text><Text style={st.bannerInfoValue}>{p.surgeryType}</Text></View>
            <View style={st.bannerInfoRow}>
              <View><Text style={st.bannerInfoLabel}>DATE</Text><Text style={st.bannerInfoValue}>{new Date(p.surgeryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
              <View><Text style={st.bannerInfoLabel}>HOSPITAL</Text><Text style={st.bannerInfoValue}>{p.hospital}</Text></View>
            </View>
          </View>
        </LinearGradient>

        {/* Recovery Progress */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Recovery Progress</Text>
          <View style={st.card}>
            <View style={st.progressRow}>
              <MiniRing value={r.currentDay} max={r.totalDays} size={64} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.progressTitle}>Day {r.currentDay} of {r.totalDays}</Text>
                <Text style={st.progressSub}>{r.daysRemaining} days remaining</Text>
                <View style={st.progressBar}><View style={[st.progressFill, { width: `${(r.currentDay / r.totalDays) * 100}%` }]} /></View>
              </View>
            </View>
          </View>
        </View>

        {/* Vitals Timeline */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Vitals Timeline</Text>
          <View style={st.card}>
            <View style={st.vitalsHeader}>
              <Text style={[st.vitalsLabel, { flex: 1 }]}>Day</Text>
              <Text style={st.vitalsLabel}>Pain</Text>
              <Text style={st.vitalsLabel}>Temp</Text>
              <Text style={st.vitalsLabel}>Mood</Text>
            </View>
            {vt.map((v: any, i: number) => {
              const moodEmoji = v.mood === 'good' ? '😊' : v.mood === 'fair' ? '😐' : '😔';
              const painColor = v.painLevel >= 7 ? Colors.semantic.error : v.painLevel >= 4 ? Colors.semantic.warning : Colors.semantic.success;
              return (
                <View key={i} style={[st.vitalsRow, i < vt.length - 1 && st.vitalsRowBorder]}>
                  <Text style={[st.vitalsCell, { flex: 1, fontWeight: '600' }]}>{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  <View style={[st.painBadge, { backgroundColor: painColor + '18' }]}><Text style={[st.painBadgeText, { color: painColor }]}>{v.painLevel}/10</Text></View>
                  <Text style={st.vitalsCell}>{v.temperature?.toFixed(1)}°C</Text>
                  <Text style={st.vitalsCell}>{moodEmoji}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Medication Adherence */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Medication Adherence</Text>
          <View style={st.card}>
            <View style={st.progressRow}>
              <MiniRing value={ma.adherenceRate} max={100} size={64} color={ma.adherenceRate >= 80 ? Colors.semantic.success : ma.adherenceRate >= 50 ? Colors.semantic.warning : Colors.semantic.error} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={st.progressTitle}>{ma.totalTaken} of {ma.totalPrescribed} doses taken</Text>
                <Text style={st.progressSub}>{ma.adherenceRate}% adherence rate</Text>
              </View>
            </View>
            <View style={st.medDivider} />
            {ma.medications.map((m: any, i: number) => (
              <View key={i} style={st.medRow}>
                <View style={[st.medDot, { backgroundColor: m.isActive ? Colors.semantic.success : Colors.neutral.mediumGray }]} />
                <View style={{ flex: 1 }}>
                  <Text style={st.medName}>{m.name} ({m.dosage})</Text>
                  <Text style={st.medProgress}>{m.takenDoses}/{m.totalDoses} doses</Text>
                </View>
                <View style={st.medBar}><View style={[st.medBarFill, { width: `${(m.takenDoses / m.totalDoses) * 100}%` }]} /></View>
              </View>
            ))}
          </View>
        </View>

        {/* Check-in & Alerts Summary */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Summary</Text>
          <View style={st.summaryRow}>
            <View style={st.summaryCard}>
              <Ionicons name="clipboard" size={24} color={Colors.primary.teal} />
              <Text style={st.summaryValue}>{report.totalCheckIns}</Text>
              <Text style={st.summaryLabel}>Check-ins</Text>
            </View>
            <View style={st.summaryCard}>
              <Ionicons name="flame" size={24} color={Colors.semantic.warning} />
              <Text style={st.summaryValue}>{report.checkInStreak}</Text>
              <Text style={st.summaryLabel}>Day Streak</Text>
            </View>
            <View style={st.summaryCard}>
              <Ionicons name="alert-circle" size={24} color={report.alerts.active > 0 ? Colors.semantic.error : Colors.semantic.success} />
              <Text style={st.summaryValue}>{report.alerts.total}</Text>
              <Text style={st.summaryLabel}>Alerts</Text>
            </View>
          </View>
        </View>

        {/* Care Team */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Care Team</Text>
          <View style={st.card}>
            {report.careTeam.map((ct: any, i: number) => (
              <View key={i} style={[st.teamRow, i < report.careTeam.length - 1 && st.vitalsRowBorder]}>
                <View style={[st.teamAvatar, { backgroundColor: ct.role === 'SURGEON' ? Colors.primary.navy : Colors.primary.teal }]}>
                  <Text style={st.teamAvatarText}>{ct.name.split(' ').map((n: string) => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.teamName}>{ct.role === 'SURGEON' ? 'Dr. ' : ''}{ct.name}</Text>
                  <Text style={st.teamSpec}>{ct.specialty}</Text>
                </View>
                <View style={[st.roleBadge, { backgroundColor: ct.role === 'SURGEON' ? Colors.semantic.infoLight : Colors.semantic.successLight }]}>
                  <Text style={[st.roleBadgeText, { color: ct.role === 'SURGEON' ? Colors.semantic.info : Colors.semantic.success }]}>{ct.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={st.footer}>
          <Text style={st.footerText}>Report generated {new Date(report.generatedAt).toLocaleString()}</Text>
          <Text style={st.footerText}>RecoverCare · Post-Surgical Recovery Platform</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  banner: { marginHorizontal: 16, borderRadius: BorderRadius.xl, padding: 20, marginBottom: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bannerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary.teal, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bannerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  bannerName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  bannerMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  bannerInfo: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, gap: 10 },
  bannerInfoItem: {},
  bannerInfoRow: { flexDirection: 'row', gap: 32 },
  bannerInfoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.5 },
  bannerInfoValue: { fontSize: 14, color: '#FFF', fontWeight: '500', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: 16, ...Shadow.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  progressSub: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: Colors.border.light, borderRadius: 3, marginTop: 8 },
  progressFill: { height: 6, backgroundColor: Colors.primary.teal, borderRadius: 3 },
  vitalsHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border.light, marginBottom: 4 },
  vitalsLabel: { fontSize: 11, fontWeight: '600', color: Colors.text.tertiary, textAlign: 'center', width: 56 },
  vitalsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  vitalsRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  vitalsCell: { fontSize: 13, color: Colors.text.primary, textAlign: 'center', width: 56 },
  painBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, width: 56, alignItems: 'center' },
  painBadgeText: { fontSize: 12, fontWeight: '600' },
  medDivider: { height: 1, backgroundColor: Colors.border.light, marginVertical: 14 },
  medRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  medDot: { width: 8, height: 8, borderRadius: 4 },
  medName: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  medProgress: { fontSize: 11, color: Colors.text.secondary, marginTop: 1 },
  medBar: { width: 60, height: 6, backgroundColor: Colors.border.light, borderRadius: 3 },
  medBarFill: { height: 6, backgroundColor: Colors.primary.teal, borderRadius: 3 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: 16, alignItems: 'center', gap: 6, ...Shadow.sm },
  summaryValue: { fontSize: 24, fontWeight: '700', color: Colors.text.primary },
  summaryLabel: { fontSize: 11, fontWeight: '500', color: Colors.text.secondary },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  teamAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  teamAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  teamName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  teamSpec: { fontSize: 12, color: Colors.text.secondary, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText: { fontSize: 11, color: Colors.text.tertiary },
});
