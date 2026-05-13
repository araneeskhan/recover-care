import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { checkInAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, G } from 'react-native-svg';

// ─── Linear Regression Engine ────────────────────────────────────────────────
function linReg(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return null;
  const sx  = data.reduce((s, d) => s + d.x, 0);
  const sy  = data.reduce((s, d) => s + d.y, 0);
  const sxy = data.reduce((s, d) => s + d.x * d.y, 0);
  const sx2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  const yHat = data.map(d => m * d.x + b);
  const ssRes = data.reduce((s, d, i) => s + Math.pow(d.y - yHat[i], 2), 0);
  const ssTot = data.reduce((s, d) => s + Math.pow(d.y - sy / n, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope: m, intercept: b, r2, predict: (x: number) => Math.max(0, Math.min(10, m * x + b)) };
}

function PredictionChart({ checkins }: { checkins: any[] }) {
  if (checkins.length < 3) return (
    <View style={{ alignItems: 'center', padding: 24 }}>
      <Ionicons name="analytics-outline" size={32} color={Colors.text.tertiary} />
      <Text style={{ color: Colors.text.tertiary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
        Need at least 3 check-ins to generate a prediction.
      </Text>
    </View>
  );

  const points = checkins.map((c, i) => ({ x: i, y: c.painLevel }));
  const reg = linReg(points);
  if (!reg) return null;

  const PRED_DAYS = 5;
  const totalPts = points.length + PRED_DAYS;
  const W = SCREEN_WIDTH - 64;
  const H = 160;
  const PAD = { t: 16, r: 16, b: 28, l: 32 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const xS = (i: number) => PAD.l + (i / Math.max(1, totalPts - 1)) * plotW;
  const yS = (v: number) => PAD.t + plotH - (v / 10) * plotH;

  // Actual line
  const actualPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xS(i)} ${yS(p.y)}`).join(' ');

  // Predicted extension (dashed)
  const predStart = points.length - 1;
  const predPath = Array.from({ length: PRED_DAYS + 1 }, (_, i) => {
    const xi = predStart + i;
    const y = reg.predict(xi);
    return `${i === 0 ? 'M' : 'L'} ${xS(xi)} ${yS(y)}`;
  }).join(' ');

  // Days until pain reaches ≤ 2
  let daysTo2: number | null = null;
  if (reg.slope < 0) {
    const x = (2 - reg.intercept) / reg.slope;
    const daysFromNow = Math.ceil(x) - (points.length - 1);
    if (daysFromNow > 0 && daysFromNow <= 30) daysTo2 = daysFromNow;
  }

  const confidence = reg.r2 >= 0.8 ? 'High' : reg.r2 >= 0.5 ? 'Moderate' : 'Low';
  const confColor  = reg.r2 >= 0.8 ? Colors.semantic.success : reg.r2 >= 0.5 ? Colors.semantic.warning : Colors.semantic.error;
  const trend      = reg.slope < -0.3 ? 'Improving' : reg.slope > 0.3 ? 'Worsening' : 'Stable';
  const trendColor = reg.slope < -0.3 ? Colors.semantic.success : reg.slope > 0.3 ? Colors.semantic.error : Colors.semantic.warning;

  return (
    <View>
      {/* Insight row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <View style={[cs.predChip, { backgroundColor: trendColor + '18' }]}>
          <Ionicons name={reg.slope < -0.3 ? 'trending-down' : reg.slope > 0.3 ? 'trending-up' : 'remove'} size={14} color={trendColor} />
          <Text style={[cs.predChipText, { color: trendColor }]}>{trend}</Text>
        </View>
        <View style={[cs.predChip, { backgroundColor: confColor + '18' }]}>
          <Ionicons name="stats-chart" size={14} color={confColor} />
          <Text style={[cs.predChipText, { color: confColor }]}>{confidence} confidence (R²={reg.r2.toFixed(2)})</Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={W} height={H}>
        <Defs>
          <SvgLinearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.semantic.error} stopOpacity="0.15" />
            <Stop offset="1" stopColor={Colors.semantic.error} stopOpacity="0.01" />
          </SvgLinearGradient>
        </Defs>

        {/* Grid */}
        {[0, 2.5, 5, 7.5, 10].map((t, i) => (
          <G key={i}>
            <Line x1={PAD.l} y1={yS(t)} x2={W - PAD.r} y2={yS(t)} stroke={Colors.border.light} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={PAD.l - 5} y={yS(t) + 4} fontSize="9" fill={Colors.text.tertiary} textAnchor="end">{t}</SvgText>
          </G>
        ))}

        {/* Actual area fill */}
        <Path d={`${actualPath} L ${xS(points.length - 1)} ${yS(0)} L ${xS(0)} ${yS(0)} Z`} fill="url(#predGrad)" />

        {/* Actual line */}
        <Path d={actualPath} stroke={Colors.semantic.error} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Actual dots */}
        {points.map((p, i) => (
          <Circle key={i} cx={xS(i)} cy={yS(p.y)} r={3.5} fill="#FFF" stroke={Colors.semantic.error} strokeWidth={2} />
        ))}

        {/* Prediction line (dashed) */}
        <Path d={predPath} stroke={Colors.primary.teal} strokeWidth={2} fill="none" strokeDasharray="6,4" strokeLinecap="round" />

        {/* Prediction dots */}
        {Array.from({ length: PRED_DAYS + 1 }, (_, i) => {
          const xi = predStart + i;
          const y = reg.predict(xi);
          return <Circle key={`p${i}`} cx={xS(xi)} cy={yS(y)} r={i === 0 ? 0 : 3} fill={Colors.primary.teal} opacity={0.7} />;
        })}

        {/* X-axis labels */}
        {points.map((_, i) => (
          <SvgText key={`xl${i}`} x={xS(i)} y={H - 4} fontSize="9" fill={Colors.text.tertiary} textAnchor="middle">D{i + 1}</SvgText>
        ))}
        {Array.from({ length: PRED_DAYS }, (_, i) => (
          <SvgText key={`px${i}`} x={xS(predStart + 1 + i)} y={H - 4} fontSize="9" fill={Colors.primary.teal} textAnchor="middle">+{i + 1}</SvgText>
        ))}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 18, height: 2.5, backgroundColor: Colors.semantic.error, borderRadius: 1 }} />
          <Text style={{ fontSize: 11, color: Colors.text.tertiary }}>Actual</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 18, height: 2, borderBottomWidth: 2, borderBottomColor: Colors.primary.teal, borderStyle: 'dashed' }} />
          <Text style={{ fontSize: 11, color: Colors.text.tertiary }}>Predicted</Text>
        </View>
      </View>

      {/* Prediction insight */}
      {daysTo2 !== null && (
        <View style={[cs.predInsight, { borderLeftColor: Colors.semantic.success }]}>
          <Ionicons name="calendar-outline" size={16} color={Colors.semantic.success} />
          <Text style={cs.predInsightText}>
            <Text style={{ fontWeight: '700', color: Colors.semantic.success }}>Estimated low-pain milestone: </Text>
            approximately {daysTo2} more day{daysTo2 !== 1 ? 's' : ''} based on your current trend.
          </Text>
        </View>
      )}
      {reg.slope > 0.3 && (
        <View style={[cs.predInsight, { borderLeftColor: Colors.semantic.error }]}>
          <Ionicons name="trending-up" size={16} color={Colors.semantic.error} />
          <Text style={cs.predInsightText}>
            <Text style={{ fontWeight: '700', color: Colors.semantic.error }}>Pain is trending upward. </Text>
            Consider contacting your care team if this continues.
          </Text>
        </View>
      )}
    </View>
  );
}

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

function painColor(level: number | null): string {
  if (level === null) return Colors.border.light;
  if (level <= 3) return '#27AE60';
  if (level <= 5) return '#F2994A';
  if (level <= 7) return '#E67E22';
  return '#E74C3C';
}

function PainCalendar({ checkins, onSelectDay }: { checkins: any[]; onSelectDay: (d: { date: string; checkin: any } | null) => void }) {
  const today = new Date();

  // Build a map: "YYYY-MM-DD" → checkin
  const checkInMap: Record<string, any> = {};
  checkins.forEach(c => {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!checkInMap[key] || c.painLevel > checkInMap[key].painLevel) {
      checkInMap[key] = c;
    }
  });

  // Build 10 weeks of days ending today, starting on Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() - 63); // 9 full weeks back

  const weeks: Date[][] = [];
  let cursor = new Date(startDate);
  while (cursor <= today) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const CELL = 34;
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Month labels along top
  const monthLabels: { month: string; colIndex: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d.getDate() === 1);
    if (first) monthLabels.push({ month: months[first.getMonth()], colIndex: wi });
  });

  // Stats for this range
  const activeDays = Object.keys(checkInMap).length;
  const allPain = Object.values(checkInMap).map((c: any) => c.painLevel);
  const avgPain = allPain.length ? (allPain.reduce((a, b) => a + b, 0) / allPain.length).toFixed(1) : '-';
  const bestDay = allPain.length ? Math.min(...allPain) : null;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      {/* Legend */}
      <View style={cs.calLegendRow}>
        <Text style={cs.calLegendLabel}>Pain level</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={cs.calLegendLabel}>Low</Text>
          {(['#27AE60', '#F2994A', '#E67E22', '#E74C3C'] as string[]).map((c, i) => (
            <View key={i} style={[cs.calCell, { backgroundColor: c, width: 14, height: 14, borderRadius: 3 }]} />
          ))}
          <Text style={cs.calLegendLabel}>High</Text>
        </View>
        <View style={[cs.calCell, { backgroundColor: Colors.border.light, width: 14, height: 14, borderRadius: 3 }]} />
        <Text style={cs.calLegendLabel}>None</Text>
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {/* Day-of-week labels */}
        <View style={{ width: 20, gap: 2, marginTop: 18 }}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[cs.calDayLabel, { height: CELL - 2, lineHeight: CELL - 2 }]}>{i % 2 === 0 ? d : ''}</Text>
          ))}
        </View>
        {/* Weeks */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Month labels */}
            <View style={{ flexDirection: 'row', height: 18, marginBottom: 2 }}>
              {weeks.map((_, wi) => {
                const ml = monthLabels.find(m => m.colIndex === wi);
                return (
                  <View key={wi} style={{ width: CELL }}>
                    {ml && <Text style={cs.calMonthLabel}>{ml.month}</Text>}
                  </View>
                );
              })}
            </View>
            {/* Day cells */}
            {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
              <View key={dayOfWeek} style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
                {weeks.map((week, wi) => {
                  const d = week[dayOfWeek];
                  const isFuture = d > today;
                  if (isFuture) return <View key={wi} style={{ width: CELL - 2 }} />;
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const ci = checkInMap[key];
                  const isToday = key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  return (
                    <TouchableOpacity
                      key={wi}
                      style={[cs.calCell, {
                        backgroundColor: ci ? painColor(ci.painLevel) : Colors.border.light,
                        borderWidth: isToday ? 2 : 0,
                        borderColor: Colors.primary.teal,
                      }]}
                      onPress={() => ci && onSelectDay({ date: key, checkin: ci })}
                      activeOpacity={ci ? 0.7 : 1}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Stats row */}
      <View style={cs.calStats}>
        <View style={cs.calStatBox}>
          <Text style={cs.calStatVal}>{activeDays}</Text>
          <Text style={cs.calStatLbl}>Check-in days</Text>
        </View>
        <View style={[cs.calStatBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border.light }]}>
          <Text style={[cs.calStatVal, { color: avgPain !== '-' && parseFloat(avgPain) > 6 ? Colors.semantic.error : Colors.semantic.success }]}>{avgPain}</Text>
          <Text style={cs.calStatLbl}>Avg pain / 10</Text>
        </View>
        <View style={cs.calStatBox}>
          <Text style={[cs.calStatVal, { color: Colors.semantic.success }]}>{bestDay ?? '-'}</Text>
          <Text style={cs.calStatLbl}>Best pain day</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: Colors.text.tertiary, textAlign: 'center', marginTop: 8 }}>
        Tap a colored cell to see that day's check-in
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'log' | 'calendar'>('charts');
  const [selectedDay, setSelectedDay] = useState<{ date: string; checkin: any } | null>(null);

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
      {/* Day detail modal */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity style={cs.modalOverlay} activeOpacity={1} onPress={() => setSelectedDay(null)}>
          <View style={cs.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={cs.modalHandle} />
            {selectedDay && (() => {
              const c = selectedDay.checkin;
              const d = new Date(c.createdAt);
              const moodInfo = MOOD_MAP[c.mood] || { emoji: '—', label: 'Unknown', color: Colors.text.secondary };
              return (
                <>
                  <Text style={cs.modalDate}>{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                  <View style={cs.modalRow}>
                    <View style={[cs.modalStatBox, { borderLeftWidth: 4, borderLeftColor: painColor(c.painLevel) }]}>
                      <Text style={cs.modalStatLbl}>PAIN</Text>
                      <Text style={[cs.modalStatVal, { color: painColor(c.painLevel) }]}>{c.painLevel}<Text style={{ fontSize: 14 }}>/10</Text></Text>
                    </View>
                    {c.temperature && (
                      <View style={[cs.modalStatBox, { borderLeftWidth: 4, borderLeftColor: Colors.semantic.warning }]}>
                        <Text style={cs.modalStatLbl}>TEMP</Text>
                        <Text style={[cs.modalStatVal, { color: Colors.semantic.warning }]}>{c.temperature.toFixed(1)}<Text style={{ fontSize: 14 }}>°C</Text></Text>
                      </View>
                    )}
                    <View style={[cs.modalStatBox, { borderLeftWidth: 4, borderLeftColor: moodInfo.color }]}>
                      <Text style={cs.modalStatLbl}>MOOD</Text>
                      <Text style={{ fontSize: 28 }}>{moodInfo.emoji}</Text>
                    </View>
                  </View>
                  {c.symptoms?.length > 0 && (
                    <View>
                      <Text style={cs.modalSection}>Symptoms reported</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {c.symptoms.map((s: string) => (
                          <View key={s} style={cs.modalChip}><Text style={cs.modalChipText}>{s}</Text></View>
                        ))}
                      </View>
                    </View>
                  )}
                  {c.notes && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={cs.modalSection}>Notes</Text>
                      <Text style={cs.modalNotes}>{c.notes}</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

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
        <TouchableOpacity style={[cs.tab, activeTab === 'calendar' && cs.tabActive]} onPress={() => setActiveTab('calendar')}>
          <Ionicons name="calendar" size={16} color={activeTab === 'calendar' ? Colors.primary.teal : Colors.text.secondary} />
          <Text style={[cs.tabText, activeTab === 'calendar' && cs.tabTextActive]}>Calendar</Text>
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

            {/* Trajectory Prediction */}
            <View style={cs.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={cs.chartLabel}>Recovery Trajectory</Text>
                <View style={{ backgroundColor: Colors.primary.teal + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: Colors.primary.teal, fontWeight: '700' }}>AI PREDICT</Text>
                </View>
              </View>
              <PredictionChart checkins={checkins} />
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
        ) : activeTab === 'calendar' ? (
          // Pain Heatmap Calendar
          <PainCalendar checkins={checkins} onSelectDay={setSelectedDay} />
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
  // Prediction
  predChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  predChipText: { fontSize: 12, fontWeight: '600' },
  predInsight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6 },
  predInsightText: { flex: 1, fontSize: 13, color: Colors.text.secondary, lineHeight: 19 },
  // Calendar
  calLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  calLegendLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '500' },
  calCell: { width: 32, height: 32, borderRadius: 6 },
  calDayLabel: { fontSize: 9, color: Colors.text.tertiary, fontWeight: '600', textAlign: 'center' },
  calMonthLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600' },
  calStats: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginTop: 16, ...Shadow.sm },
  calStatBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  calStatVal: { fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  calStatLbl: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border.medium, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalDate: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 16 },
  modalRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modalStatBox: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: 12, padding: 14 },
  modalStatLbl: { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.8, marginBottom: 4 },
  modalStatVal: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  modalSection: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalChip: { backgroundColor: Colors.background.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  modalChipText: { fontSize: 13, fontWeight: '500', color: Colors.text.primary },
  modalNotes: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20, fontStyle: 'italic' },
});
