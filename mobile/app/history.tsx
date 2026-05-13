import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { checkInAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 20, right: 16, bottom: 28, left: 32 };

const DEMO_CHECKINS = [
  { id: '1', painLevel: 6, temperature: 37.4, mood: 'fair', symptoms: ['Fatigue', 'Swelling'], createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '2', painLevel: 5, temperature: 37.2, mood: 'fair', symptoms: ['Fatigue', 'Swelling'], createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '3', painLevel: 4, temperature: 37.0, mood: 'good', symptoms: ['Fatigue'], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '4', painLevel: 3, temperature: 36.9, mood: 'good', symptoms: ['Fatigue'], createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
];

const MOOD_MAP: Record<string, { emoji: string; label: string; value: number; color: string }> = {
  great: { emoji: '😊', label: 'Great', value: 5, color: '#27AE60' },
  good: { emoji: '🙂', label: 'Good', value: 4, color: '#2EC4B6' },
  fair: { emoji: '😐', label: 'Fair', value: 3, color: '#F2994A' },
  poor: { emoji: '😟', label: 'Poor', value: 2, color: '#E67E22' },
  bad: { emoji: '😣', label: 'Bad', value: 1, color: '#E74C3C' },
};

function MiniLineChart({
  data,
  maxY,
  minY = 0,
  color,
  gradientId,
  formatY,
  label,
  unit,
  showDots = true,
}: {
  data: { x: number; y: number; label: string }[];
  maxY: number;
  minY?: number;
  color: string;
  gradientId: string;
  formatY?: (v: number) => string;
  label: string;
  unit: string;
  showDots?: boolean;
}) {
  if (data.length === 0) return null;

  const plotW = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const xScale = (i: number) => CHART_PADDING.left + (i / Math.max(1, data.length - 1)) * plotW;
  const yScale = (v: number) => CHART_PADDING.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  // Build line path
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.y)}`).join(' ');

  // Area path
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${CHART_PADDING.top + plotH} L ${xScale(0)} ${CHART_PADDING.top + plotH} Z`;

  // Y-axis labels
  const yTicks = [minY, minY + (maxY - minY) / 2, maxY];

  return (
    <View style={cs.chartContainer}>
      <View style={cs.chartHeader}>
        <Text style={cs.chartLabel}>{label}</Text>
        {data.length > 0 && (
          <Text style={[cs.chartCurrent, { color }]}>
            {formatY ? formatY(data[data.length - 1].y) : data[data.length - 1].y}{unit}
          </Text>
        )}
      </View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <Line key={i} x1={CHART_PADDING.left} y1={yScale(t)} x2={CHART_WIDTH - CHART_PADDING.right} y2={yScale(t)}
            stroke={Colors.border.light} strokeWidth={1} strokeDasharray="4,4" />
        ))}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <SvgText key={`yl${i}`} x={CHART_PADDING.left - 8} y={yScale(t) + 4}
            fontSize="10" fill={Colors.text.tertiary} textAnchor="end">
            {formatY ? formatY(t) : t}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {showDots && data.map((d, i) => (
          <Circle key={i} cx={xScale(i)} cy={yScale(d.y)} r={4} fill="#FFF" stroke={color} strokeWidth={2.5} />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <SvgText key={`xl${i}`} x={xScale(i)} y={CHART_HEIGHT - 4}
            fontSize="10" fill={Colors.text.tertiary} textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function SymptomBar({ symptom, count, total, color }: { symptom: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={cs.symptomRow}>
      <Text style={cs.symptomName}>{symptom}</Text>
      <View style={cs.symptomBarBg}>
        <View style={[cs.symptomBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={cs.symptomCount}>{count}/{total}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'log'>('charts');

  const fetchData = useCallback(async () => {
    try {
      const r = await checkInAPI.getHistory();
      setCheckins(r.data?.length ? r.data.reverse() : DEMO_CHECKINS);
    } catch {
      setCheckins(DEMO_CHECKINS);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // Prepare chart data
  const formatDay = (iso: string) => {
    const d = new Date(iso);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const painData = checkins.map((c, i) => ({ x: i, y: c.painLevel, label: formatDay(c.createdAt) }));
  const tempData = checkins.filter(c => c.temperature).map((c, i) => ({ x: i, y: c.temperature, label: formatDay(c.createdAt) }));
  const moodData = checkins.filter(c => c.mood).map((c, i) => ({ x: i, y: MOOD_MAP[c.mood]?.value || 3, label: formatDay(c.createdAt) }));

  // Symptom frequency
  const symptomCounts: Record<string, number> = {};
  checkins.forEach(c => (c.symptoms || []).forEach((s: string) => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
  const symptomsSorted = Object.entries(symptomCounts).sort(([, a], [, b]) => b - a);
  const symptomColors = [Colors.semantic.error, Colors.semantic.warning, Colors.primary.teal, Colors.semantic.info, Colors.primary.navy, Colors.neutral.mediumGray];

  // Stats
  const avgPain = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.painLevel, 0) / checkins.length).toFixed(1) : '-';
  const latestMood = checkins.length > 0 ? MOOD_MAP[checkins[checkins.length - 1]?.mood] : null;
  const painTrend = checkins.length >= 2 ? checkins[checkins.length - 1].painLevel - checkins[checkins.length - 2].painLevel : 0;

  return (
    <View style={cs.container}>
      {/* Header */}
      <View style={cs.header}>
        <TouchableOpacity onPress={() => router.back()} style={cs.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={cs.title}>Recovery Trends</Text>
          <Text style={cs.subtitle}>{checkins.length} check-ins recorded</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={cs.tabs}>
        <TouchableOpacity style={[cs.tab, activeTab === 'charts' && cs.tabActive]} onPress={() => setActiveTab('charts')}>
          <Ionicons name="analytics" size={16} color={activeTab === 'charts' ? Colors.primary.teal : Colors.text.secondary} />
          <Text style={[cs.tabText, activeTab === 'charts' && cs.tabTextActive]}>Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cs.tab, activeTab === 'log' && cs.tabActive]} onPress={() => setActiveTab('log')}>
          <Ionicons name="list" size={16} color={activeTab === 'log' ? Colors.primary.teal : Colors.text.secondary} />
          <Text style={[cs.tabText, activeTab === 'log' && cs.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {activeTab === 'charts' ? (
          <>
            {/* Summary stats */}
            <View style={cs.statsRow}>
              <View style={cs.statCard}>
                <Text style={cs.statLabel}>AVG PAIN</Text>
                <Text style={cs.statValue}>{avgPain}<Text style={cs.statUnit}>/10</Text></Text>
                <View style={[cs.statTrend, painTrend > 0 ? cs.statTrendBad : cs.statTrendGood]}>
                  <Ionicons name={painTrend > 0 ? 'arrow-up' : painTrend < 0 ? 'arrow-down' : 'remove'} size={12}
                    color={painTrend > 0 ? Colors.semantic.error : Colors.semantic.success} />
                  <Text style={[cs.statTrendText, { color: painTrend > 0 ? Colors.semantic.error : Colors.semantic.success }]}>
                    {Math.abs(painTrend)} from last
                  </Text>
                </View>
              </View>
              <View style={cs.statCard}>
                <Text style={cs.statLabel}>MOOD</Text>
                <Text style={{ fontSize: 28 }}>{latestMood?.emoji || '—'}</Text>
                <Text style={[cs.statTrendText, { color: latestMood?.color || Colors.text.secondary }]}>
                  {latestMood?.label || 'No data'}
                </Text>
              </View>
              <View style={cs.statCard}>
                <Text style={cs.statLabel}>STREAK</Text>
                <Text style={cs.statValue}>{checkins.length}<Text style={cs.statUnit}>d</Text></Text>
                <Text style={[cs.statTrendText, { color: Colors.semantic.success }]}>
                  {checkins.length > 0 ? '🔥 Active' : 'Start today'}
                </Text>
              </View>
            </View>

            {/* Pain Chart */}
            <View style={cs.chartCard}>
              <MiniLineChart
                data={painData}
                maxY={10}
                minY={0}
                color={Colors.semantic.error}
                gradientId="painGrad"
                label="Pain Level"
                unit="/10"
              />
            </View>

            {/* Temperature Chart */}
            {tempData.length > 0 && (
              <View style={cs.chartCard}>
                <MiniLineChart
                  data={tempData}
                  maxY={39}
                  minY={36}
                  color={Colors.semantic.warning}
                  gradientId="tempGrad"
                  formatY={(v) => v.toFixed(1)}
                  label="Temperature"
                  unit="°C"
                />
              </View>
            )}

            {/* Mood Chart */}
            {moodData.length > 0 && (
              <View style={cs.chartCard}>
                <MiniLineChart
                  data={moodData}
                  maxY={5}
                  minY={1}
                  color={Colors.primary.teal}
                  gradientId="moodGrad"
                  formatY={(v) => ['', '😣', '😟', '😐', '🙂', '😊'][Math.round(v)] || ''}
                  label="Mood"
                  unit=""
                />
              </View>
            )}

            {/* Symptom Frequency */}
            {symptomsSorted.length > 0 && (
              <View style={cs.chartCard}>
                <View style={cs.chartContainer}>
                  <Text style={cs.chartLabel}>Symptom Frequency</Text>
                  <View style={{ marginTop: 12 }}>
                    {symptomsSorted.map(([sym, count], i) => (
                      <SymptomBar key={sym} symptom={sym} count={count} total={checkins.length}
                        color={symptomColors[i % symptomColors.length]} />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          // History Log
          <>
            {checkins.slice().reverse().map((c, i) => {
              const d = new Date(c.createdAt);
              const moodInfo = MOOD_MAP[c.mood] || { emoji: '—', label: 'Unknown', color: Colors.text.secondary };
              return (
                <View key={c.id || i} style={cs.logCard}>
                  <View style={cs.logDate}>
                    <Text style={cs.logDay}>{d.getDate()}</Text>
                    <Text style={cs.logMonth}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
                  </View>
                  <View style={cs.logContent}>
                    <View style={cs.logHeader}>
                      <Text style={cs.logTitle}>Day {checkins.length - i} Check-In</Text>
                      <Text style={{ fontSize: 20 }}>{moodInfo.emoji}</Text>
                    </View>
                    <View style={cs.logStats}>
                      <View style={cs.logStat}>
                        <Ionicons name="water" size={12} color={Colors.semantic.error} />
                        <Text style={cs.logStatText}>Pain: {c.painLevel}/10</Text>
                      </View>
                      {c.temperature && (
                        <View style={cs.logStat}>
                          <Ionicons name="thermometer" size={12} color={Colors.semantic.warning} />
                          <Text style={cs.logStatText}>{c.temperature.toFixed(1)}°C</Text>
                        </View>
                      )}
                    </View>
                    {c.symptoms?.length > 0 && (
                      <View style={cs.logSymptoms}>
                        {c.symptoms.map((s: string) => (
                          <View key={s} style={cs.logSymChip}>
                            <Text style={cs.logSymText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {c.notes && <Text style={cs.logNotes} numberOfLines={2}>{c.notes}</Text>}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 12, ...Shadow.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: 'rgba(26,158,143,0.1)' },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.text.secondary },
  tabTextActive: { color: Colors.primary.teal, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', ...Shadow.sm },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary, letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.text.primary },
  statUnit: { fontSize: 14, fontWeight: '400', color: Colors.text.tertiary },
  statTrend: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statTrendGood: { backgroundColor: Colors.semantic.successLight },
  statTrendBad: { backgroundColor: Colors.semantic.errorLight },
  statTrendText: { fontSize: 11, fontWeight: '500' },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, ...Shadow.sm },
  chartContainer: {},
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartLabel: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  chartCurrent: { fontSize: 15, fontWeight: '700' },
  symptomRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  symptomName: { width: 80, fontSize: 13, fontWeight: '500', color: Colors.text.primary },
  symptomBarBg: { flex: 1, height: 8, backgroundColor: Colors.border.light, borderRadius: 4, overflow: 'hidden' },
  symptomBarFill: { height: 8, borderRadius: 4 },
  symptomCount: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, width: 30, textAlign: 'right' },
  logCard: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, ...Shadow.sm },
  logDate: { width: 48, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logDay: { fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  logMonth: { fontSize: 12, fontWeight: '500', color: Colors.text.secondary },
  logContent: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  logStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  logStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logStatText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  logSymptoms: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  logSymChip: { backgroundColor: Colors.background.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  logSymText: { fontSize: 11, fontWeight: '500', color: Colors.text.secondary },
  logNotes: { fontSize: 13, color: Colors.text.secondary, fontStyle: 'italic', lineHeight: 18 },
});
