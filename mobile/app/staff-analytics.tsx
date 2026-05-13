import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Rect, Text as SvgText, Circle, Line, Path } from 'react-native-svg';
import { staffAPI } from '../services/api';
import { Colors, Shadow, FontSize, FontWeight } from '../constants/Colors';

const { width: SW } = Dimensions.get('window');

function riskColor(score: number): string {
  if (score >= 75) return '#E74C3C';
  if (score >= 50) return '#E67E22';
  if (score >= 30) return '#F2994A';
  return '#27AE60';
}

function riskLabel(score: number): string {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 30) return 'Moderate';
  return 'Low';
}

function trendIcon(slope: number) {
  if (slope > 0.3)  return { name: 'trending-up',   color: '#E74C3C' } as const;
  if (slope < -0.3) return { name: 'trending-down',  color: '#27AE60' } as const;
  return              { name: 'remove',              color: '#F2994A' } as const;
}

// ─── Risk Bar Chart ──────────────────────────────────────────────────────────
function RiskBarChart({ patients }: { patients: any[] }) {
  const barW = Math.max(28, Math.floor((SW - 80) / Math.min(patients.length, 8)) - 6);
  const H = 120;
  const topPad = 20;
  const botPad = 32;
  const plotH = H - topPad - botPad;

  const displayed = patients.slice(0, 8);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={Math.max(SW - 48, displayed.length * (barW + 8) + 16)} height={H}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = topPad + plotH - (v / 100) * plotH;
          return (
            <Line key={v} x1={0} y1={y} x2={displayed.length * (barW + 8) + 16} y2={y}
              stroke={Colors.border.light} strokeWidth={1} strokeDasharray={v === 0 ? 'none' : '3,3'} />
          );
        })}

        {displayed.map((p, i) => {
          const barH = Math.max(4, (p.riskScore / 100) * plotH);
          const x = 8 + i * (barW + 8);
          const y = topPad + plotH - barH;
          const color = riskColor(p.riskScore);
          const initials = p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
          return (
            <React.Fragment key={p.id}>
              <Rect x={x} y={y} width={barW} height={barH} rx={6} fill={color} opacity={0.85} />
              <SvgText x={x + barW / 2} y={y - 5} fontSize="11" fontWeight="700" fill={color} textAnchor="middle">
                {p.riskScore}
              </SvgText>
              <SvgText x={x + barW / 2} y={H - 14} fontSize="9" fill={Colors.text.secondary} textAnchor="middle">
                {initials}
              </SvgText>
              <SvgText x={x + barW / 2} y={H - 4} fontSize="8" fill={Colors.text.tertiary} textAnchor="middle">
                D{p.currentDay}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

// ─── Symptom Donut ───────────────────────────────────────────────────────────
function SymptomBars({ symptoms }: { symptoms: [string, number][] }) {
  const max = symptoms[0]?.[1] ?? 1;
  const COLORS = [Colors.semantic.error, Colors.semantic.warning, Colors.primary.teal, Colors.semantic.info, '#8E44AD'];
  return (
    <View style={{ gap: 10 }}>
      {symptoms.map(([sym, count], i) => (
        <View key={sym} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: Colors.text.primary }}>{sym}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: Colors.border.light, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${(count / max) * 100}%`, height: 8, backgroundColor: COLORS[i % COLORS.length], borderRadius: 4 }} />
          </View>
          <Text style={{ width: 24, fontSize: 12, color: Colors.text.secondary, textAlign: 'right' }}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Risk Score Ring ─────────────────────────────────────────────────────────
function MiniRisk({ score }: { score: number }) {
  const SIZE = 44, SW2 = 5, R = (SIZE - SW2) / 2;
  const C = 2 * Math.PI * R;
  const color = riskColor(score);
  return (
    <View style={{ width: SIZE, height: SIZE, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color + '25'} strokeWidth={SW2} fill="none" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color} strokeWidth={SW2} fill="none"
          strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} strokeLinecap="round" />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 10, fontWeight: '800', color }}>{score}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

const DEMO_DATA = {
  patients: [
    { id: '1', name: 'Sarah Johnson', mrn: 'MRN-001', surgeryType: 'Appendectomy', currentDay: 11, totalDays: 14, riskScore: 72, riskBreakdown: { pain: 32, alerts: 20, adherence: 14, consistency: 6 }, avgPain: 6.2, painTrend: 0.4, checkInsLast7: 5, activeAlerts: 2, adherenceRate: 78, latestMood: 'fair', latestPain: 6, latestTemp: 37.8 },
    { id: '2', name: 'James Martinez', mrn: 'MRN-002', surgeryType: 'Knee Replacement', currentDay: 5, totalDays: 21, riskScore: 55, riskBreakdown: { pain: 28, alerts: 12, adherence: 8, consistency: 7 }, avgPain: 5.4, painTrend: -0.2, checkInsLast7: 4, activeAlerts: 1, adherenceRate: 85, latestMood: 'good', latestPain: 5, latestTemp: 37.2 },
    { id: '3', name: 'Emily Chen', mrn: 'MRN-003', surgeryType: 'Cholecystectomy', currentDay: 8, totalDays: 14, riskScore: 28, riskBreakdown: { pain: 14, alerts: 3, adherence: 4, consistency: 7 }, avgPain: 2.8, painTrend: -0.5, checkInsLast7: 7, activeAlerts: 0, adherenceRate: 95, latestMood: 'great', latestPain: 2, latestTemp: 36.7 },
    { id: '4', name: 'Robert Kim', mrn: 'MRN-004', surgeryType: 'Hernia Repair', currentDay: 3, totalDays: 10, riskScore: 82, riskBreakdown: { pain: 36, alerts: 24, adherence: 14, consistency: 8 }, avgPain: 7.8, painTrend: 0.8, checkInsLast7: 3, activeAlerts: 3, adherenceRate: 62, latestMood: 'bad', latestPain: 8, latestTemp: 38.4 },
  ],
  population: { totalPatients: 4, overallAvgPain: 5.6, checkInRate7d: 75, topSymptoms: [['Fatigue', 12], ['Swelling', 8], ['Pain', 7], ['Nausea', 5], ['Fever', 3]], criticalAlerts: 2, highRiskPatients: 2 },
};

export default function StaffAnalyticsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'risk' | 'pain' | 'checkins'>('risk');

  const load = useCallback(async () => {
    try {
      const r = await staffAPI.getAnalytics();
      setData(r.data);
    } catch {
      setData(DEMO_DATA);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!data) return (
    <View style={[as.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name="analytics" size={32} color={Colors.primary.teal} />
      <Text style={{ color: Colors.text.secondary, marginTop: 12 }}>Loading analytics…</Text>
    </View>
  );

  const pop = data.population;
  const patients: any[] = [...(data.patients || [])].sort((a, b) => {
    if (sortBy === 'risk')    return b.riskScore - a.riskScore;
    if (sortBy === 'pain')    return b.avgPain - a.avgPain;
    return a.checkInsLast7 - b.checkInsLast7;
  });

  const highRisk = patients.filter(p => p.riskScore >= 60);

  return (
    <View style={as.container}>
      {/* Header */}
      <LinearGradient colors={['#1A2744', '#2C3E6E']} style={as.header}>
        <TouchableOpacity onPress={() => router.back()} style={as.back}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={as.title}>Patient Analytics</Text>
          <Text style={as.subtitle}>Risk stratification · {pop.totalPatients} patients</Text>
        </View>
        <TouchableOpacity style={as.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {/* Population KPIs */}
        <View style={as.kpiGrid}>
          {[
            { label: 'Avg Pain', value: pop.overallAvgPain, unit: '/10', color: pop.overallAvgPain > 6 ? '#E74C3C' : '#27AE60', icon: 'water' },
            { label: 'Check-in Rate', value: `${pop.checkInRate7d}%`, unit: '', color: pop.checkInRate7d < 70 ? '#E74C3C' : '#27AE60', icon: 'clipboard' },
            { label: 'High Risk', value: pop.highRiskPatients, unit: ' pts', color: pop.highRiskPatients > 0 ? '#E67E22' : '#27AE60', icon: 'alert-circle' },
            { label: 'Critical Alerts', value: pop.criticalAlerts, unit: '', color: pop.criticalAlerts > 0 ? '#E74C3C' : '#27AE60', icon: 'warning' },
          ].map((k, i) => (
            <View key={i} style={as.kpiCard}>
              <View style={[as.kpiIcon, { backgroundColor: k.color + '18' }]}>
                <Ionicons name={k.icon as any} size={16} color={k.color} />
              </View>
              <Text style={[as.kpiVal, { color: k.color }]}>{k.value}<Text style={as.kpiUnit}>{k.unit}</Text></Text>
              <Text style={as.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Risk Chart */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <Text style={as.cardTitle}>Risk Score by Patient</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[['CRIT', 75, '#E74C3C'], ['HIGH', 50, '#E67E22'], ['MOD', 30, '#F2994A']].map(([l, , c]) => (
                <View key={l as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c as string }} />
                  <Text style={{ fontSize: 9, color: Colors.text.tertiary }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
          {patients.length > 0 ? <RiskBarChart patients={patients} /> : (
            <Text style={{ color: Colors.text.tertiary, textAlign: 'center', padding: 20 }}>No patient data</Text>
          )}
        </View>

        {/* Attention Required */}
        {highRisk.length > 0 && (
          <View style={[as.card, { borderLeftWidth: 4, borderLeftColor: '#E74C3C' }]}>
            <Text style={as.cardTitle}>Requires Attention</Text>
            <Text style={{ fontSize: 12, color: Colors.text.secondary, marginBottom: 12 }}>
              {highRisk.length} patient{highRisk.length !== 1 ? 's' : ''} with elevated risk scores
            </Text>
            {highRisk.map(p => {
              const ti = trendIcon(p.painTrend);
              return (
                <TouchableOpacity key={p.id} style={as.atRiskRow}
                  onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: p.id } } as any)}>
                  <MiniRisk score={p.riskScore} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={as.atName}>{p.name}</Text>
                    <Text style={as.atSub}>{p.surgeryType} · Day {p.currentDay}/{p.totalDays}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={[as.atChip, { backgroundColor: Colors.semantic.errorLight }]}>
                        <Ionicons name="water" size={10} color={Colors.semantic.error} />
                        <Text style={{ fontSize: 11, color: Colors.semantic.error, fontWeight: '600' }}>Pain {p.avgPain.toFixed(1)}</Text>
                      </View>
                      {p.activeAlerts > 0 && (
                        <View style={[as.atChip, { backgroundColor: '#FADBD8' }]}>
                          <Ionicons name="warning" size={10} color="#E74C3C" />
                          <Text style={{ fontSize: 11, color: '#E74C3C', fontWeight: '600' }}>{p.activeAlerts} alert{p.activeAlerts !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      <View style={[as.atChip, { backgroundColor: ti.color + '18' }]}>
                        <Ionicons name={ti.name} size={10} color={ti.color} />
                        <Text style={{ fontSize: 11, color: ti.color, fontWeight: '600' }}>
                          {ti.name === 'trending-up' ? 'Worsening' : ti.name === 'trending-down' ? 'Improving' : 'Stable'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.neutral.mediumGray} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Sort + Full Patient Table */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <Text style={as.cardTitle}>All Patients</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['risk', 'pain', 'checkins'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => setSortBy(s)}
                  style={[as.sortChip, sortBy === s && { backgroundColor: Colors.primary.teal }]}>
                  <Text style={[as.sortChipText, sortBy === s && { color: '#FFF' }]}>
                    {s === 'risk' ? 'Risk' : s === 'pain' ? 'Pain' : 'Check-ins'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {patients.map((p, i) => {
            const ti = trendIcon(p.painTrend);
            return (
              <TouchableOpacity key={p.id} style={[as.tableRow, i < patients.length - 1 && as.tableRowBorder]}
                onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: p.id } } as any)}>
                <View style={{ width: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: riskColor(p.riskScore) }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={as.tablePatient}>{p.name}</Text>
                  <Text style={as.tableSub}>{p.surgeryType} · D{p.currentDay}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <View style={[as.riskBadge, { backgroundColor: riskColor(p.riskScore) + '20' }]}>
                    <Text style={[as.riskBadgeText, { color: riskColor(p.riskScore) }]}>{riskLabel(p.riskScore)} · {p.riskScore}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={ti.name} size={11} color={ti.color} />
                    <Text style={{ fontSize: 11, color: Colors.text.tertiary }}>{p.adherenceRate}% adherent</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Risk Breakdown */}
        <View style={as.card}>
          <Text style={as.cardTitle}>Risk Score Components</Text>
          <Text style={{ fontSize: 12, color: Colors.text.secondary, marginBottom: 14 }}>
            How each factor contributes to patient risk
          </Text>
          {[
            { label: 'Pain Level (40 pts max)', desc: 'Average pain score from last 7 days', color: Colors.semantic.error, icon: 'water' },
            { label: 'Alert Frequency (30 pts max)', desc: 'Weighted sum of active alerts by severity', color: Colors.semantic.warning, icon: 'warning' },
            { label: 'Medication Adherence (20 pts max)', desc: 'Higher risk when doses are missed', color: '#8E44AD', icon: 'medical' },
            { label: 'Check-in Consistency (10 pts max)', desc: 'Risk increases if check-ins are missed', color: Colors.semantic.info, icon: 'clipboard' },
          ].map((f, i) => (
            <View key={i} style={as.factorRow}>
              <View style={[as.factorIcon, { backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon as any} size={16} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.primary }}>{f.label}</Text>
                <Text style={{ fontSize: 12, color: Colors.text.secondary, marginTop: 1 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Symptoms */}
        {pop.topSymptoms?.length > 0 && (
          <View style={as.card}>
            <Text style={as.cardTitle}>Most Reported Symptoms (7 days)</Text>
            <View style={{ marginTop: 12 }}>
              <SymptomBars symptoms={pop.topSymptoms} />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const as = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  kpiGrid: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, alignItems: 'center', ...Shadow.sm },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  kpiVal: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  kpiUnit: { fontSize: 12, fontWeight: '400', color: Colors.text.tertiary },
  kpiLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600', marginTop: 3, textAlign: 'center' },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 18, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  atRiskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  atName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  atSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  atChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  tablePatient: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  tableSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 1 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },
  sortChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.background.primary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 },
  factorIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
});
