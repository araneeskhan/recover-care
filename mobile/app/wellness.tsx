import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { checkInAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';
import Svg, { Circle } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

const MOOD_VALUES: Record<string, number> = { great: 100, good: 80, fair: 60, poor: 35, bad: 15 };
const MOOD_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: '😊', label: 'Great', color: '#27AE60' },
  good:  { emoji: '🙂', label: 'Good',  color: '#2EC4B6' },
  fair:  { emoji: '😐', label: 'Fair',  color: '#F2994A' },
  poor:  { emoji: '😟', label: 'Poor',  color: '#E67E22' },
  bad:   { emoji: '😣', label: 'Bad',   color: '#E74C3C' },
};

const DEMO = [
  { painLevel: 6, temperature: 37.4, mood: 'fair', symptoms: ['Fatigue','Swelling'], createdAt: new Date(Date.now()-4*86400000).toISOString() },
  { painLevel: 5, temperature: 37.1, mood: 'fair', symptoms: ['Fatigue'], createdAt: new Date(Date.now()-3*86400000).toISOString() },
  { painLevel: 4, temperature: 36.9, mood: 'good', symptoms: ['Fatigue'], createdAt: new Date(Date.now()-2*86400000).toISOString() },
  { painLevel: 3, temperature: 36.8, mood: 'good', symptoms: [], createdAt: new Date(Date.now()-86400000).toISOString() },
  { painLevel: 2, temperature: 36.7, mood: 'great', symptoms: [], createdAt: new Date().toISOString() },
];

function computeScore(checkin: any): number {
  if (!checkin) return 0;
  const painScore   = ((10 - checkin.painLevel) / 9) * 40;  // 40 pts
  const moodScore   = ((MOOD_VALUES[checkin.mood] || 50) / 100) * 30; // 30 pts
  const tempScore   = checkin.temperature
    ? (checkin.temperature >= 36.5 && checkin.temperature <= 37.5 ? 20 : checkin.temperature <= 38 ? 12 : 4)
    : 14; // 20 pts
  const symptomScore = Math.max(0, 10 - (checkin.symptoms?.length || 0) * 3); // 10 pts
  return Math.round(Math.min(100, painScore + moodScore + tempScore + symptomScore));
}

function scoreColor(s: number) {
  if (s >= 75) return '#27AE60';
  if (s >= 50) return '#F2994A';
  return '#E74C3C';
}

function scoreLabel(s: number) {
  if (s >= 80) return { label: 'Excellent', sub: "You're recovering beautifully. Keep it up!" };
  if (s >= 65) return { label: 'Good',      sub: 'Recovery is on track. Minor discomfort is normal.' };
  if (s >= 50) return { label: 'Fair',      sub: "Some symptoms present. Stay hydrated and rest." };
  if (s >= 35) return { label: 'Low',       sub: 'Several symptoms reported. Consider messaging your care team.' };
  return            { label: 'Poor',       sub: 'Please contact your care team or check-in immediately.' };
}

function WellnessRing({ score, size = 180 }: { score: number; size?: number }) {
  const animVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animVal, { toValue: score, duration: 1200, useNativeDriver: false }).start();
  }, [score]);

  const sw = 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const color = scoreColor(score);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color }}>{score}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.secondary, marginTop: -4 }}>/ 100</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color, letterSpacing: 1, marginTop: 4 }}>
          {scoreLabel(score).label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function BreakdownBar({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={ws.bbRow}>
      <View style={[ws.bbIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={ws.bbLabel}>{label}</Text>
          <Text style={[ws.bbVal, { color }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={ws.bbTrack}>
          <View style={[ws.bbFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

export default function WellnessScreen() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const r = await checkInAPI.getHistory();
      const data = r.data?.length ? r.data.reverse() : DEMO;
      setCheckins(data);
    } catch {
      setCheckins(DEMO);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const latest = checkins[checkins.length - 1];
  const score  = computeScore(latest);
  const { label, sub } = scoreLabel(score);
  const color  = scoreColor(score);

  // Trend: last 7 check-ins
  const trend = checkins.slice(-7).map((c, i) => ({ i, s: computeScore(c), mood: c.mood }));

  // 7-day average
  const avg7 = trend.length ? Math.round(trend.reduce((a, b) => a + b.s, 0) / trend.length) : 0;

  // Breakdown for latest
  const painPct    = latest ? ((10 - latest.painLevel) / 9) * 100 : 0;
  const moodPct    = latest ? (MOOD_VALUES[latest.mood] || 50) : 50;
  const tempPct    = latest?.temperature
    ? (latest.temperature >= 36.5 && latest.temperature <= 37.5 ? 100 : latest.temperature <= 38 ? 60 : 20)
    : 70;
  const symPct = latest ? Math.max(0, 100 - (latest.symptoms?.length || 0) * 30) : 100;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={ws.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={ws.header}>
        <TouchableOpacity onPress={() => router.back()} style={ws.back}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ws.title}>Wellness Score</Text>
          <Text style={ws.subtitle}>How you're feeling today</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {/* Score Ring Card */}
        <View style={ws.ringCard}>
          <WellnessRing score={score} />
          <Text style={[ws.scoreLabel, { color }]}>{label}</Text>
          <Text style={ws.scoreSub}>{sub}</Text>
          {latest && (
            <View style={ws.latestRow}>
              <View style={ws.latestChip}>
                <Ionicons name="water" size={13} color={Colors.semantic.error} />
                <Text style={ws.latestChipText}>Pain {latest.painLevel}/10</Text>
              </View>
              {latest.temperature && (
                <View style={ws.latestChip}>
                  <Ionicons name="thermometer" size={13} color={Colors.semantic.warning} />
                  <Text style={ws.latestChipText}>{latest.temperature.toFixed(1)}°C</Text>
                </View>
              )}
              {latest.mood && (
                <View style={ws.latestChip}>
                  <Text>{MOOD_LABELS[latest.mood]?.emoji || '—'}</Text>
                  <Text style={ws.latestChipText}>{MOOD_LABELS[latest.mood]?.label || ''}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 7-Day Trend */}
        <View style={ws.card}>
          <View style={ws.cardHeader}>
            <Text style={ws.cardTitle}>7-Day Trend</Text>
            <View style={[ws.avgBadge, { backgroundColor: scoreColor(avg7) + '18' }]}>
              <Text style={[ws.avgBadgeText, { color: scoreColor(avg7) }]}>Avg {avg7}</Text>
            </View>
          </View>
          <View style={ws.trendRow}>
            {trend.map((t, i) => {
              const barH = Math.max(8, (t.s / 100) * 80);
              const isLast = i === trend.length - 1;
              return (
                <View key={i} style={ws.trendCol}>
                  <Text style={[ws.trendScore, { color: scoreColor(t.s), opacity: isLast ? 1 : 0.6 }]}>{t.s}</Text>
                  <View style={ws.trendBarBg}>
                    <View style={[ws.trendBarFill, {
                      height: barH,
                      backgroundColor: isLast ? scoreColor(t.s) : scoreColor(t.s) + '80',
                    }]} />
                  </View>
                  <Text style={ws.trendDay}>{weekDays[(i + (7 - trend.length)) % 7]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={ws.card}>
          <Text style={ws.cardTitle}>Score Breakdown</Text>
          <View style={{ marginTop: 12, gap: 14 }}>
            <BreakdownBar label="Pain Control" value={painPct} max={100} color={Colors.semantic.error} icon="water" />
            <BreakdownBar label="Mood & Wellbeing" value={moodPct} max={100} color={Colors.primary.teal} icon="happy" />
            <BreakdownBar label="Temperature" value={tempPct} max={100} color={Colors.semantic.warning} icon="thermometer" />
            <BreakdownBar label="Symptom Load" value={symPct} max={100} color={Colors.semantic.info} icon="bandage" />
          </View>
          <Text style={ws.breakdownNote}>Based on your most recent check-in</Text>
        </View>

        {/* Wellness Tips */}
        <View style={ws.card}>
          <Text style={ws.cardTitle}>Personalized Tips</Text>
          {[
            score < 50 && { icon: 'call', color: Colors.semantic.error, tip: 'Your score is low — consider messaging your care team today.' },
            (latest?.painLevel ?? 0) >= 7 && { icon: 'medkit', color: Colors.semantic.warning, tip: 'High pain detected. Try to rest and avoid strenuous activity.' },
            (latest?.symptoms?.length ?? 0) >= 3 && { icon: 'alert-circle', color: Colors.semantic.warning, tip: 'Multiple symptoms reported. Stay hydrated and monitor closely.' },
            (!latest?.mood || latest.mood === 'poor' || latest.mood === 'bad') && { icon: 'heart', color: '#8E44AD', tip: 'Feeling low is normal during recovery. Consider calling a loved one.' },
            { icon: 'checkmark-circle', color: Colors.primary.teal, tip: 'Complete today\'s check-in to keep your wellness score current.' },
            { icon: 'water', color: Colors.semantic.info, tip: 'Drink 8+ glasses of water today. Hydration speeds up wound healing.' },
          ].filter(Boolean).slice(0, 4).map((t: any, i) => (
            <View key={i} style={ws.tipRow}>
              <View style={[ws.tipIcon, { backgroundColor: t.color + '18' }]}>
                <Ionicons name={t.icon} size={18} color={t.color} />
              </View>
              <Text style={ws.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ws = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ringCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 24, padding: 24, alignItems: 'center', ...Shadow.md },
  scoreLabel: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  scoreSub: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 12 },
  latestRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  latestChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.background.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  latestChipText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14, borderRadius: 20, padding: 20, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  avgBadgeText: { fontSize: 13, fontWeight: '700' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 110 },
  trendCol: { alignItems: 'center', gap: 4, flex: 1 },
  trendScore: { fontSize: 11, fontWeight: '700' },
  trendBarBg: { width: 28, height: 80, backgroundColor: Colors.background.primary, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  trendBarFill: { width: '100%', borderRadius: 6 },
  trendDay: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600' },
  bbRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bbIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bbLabel: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  bbVal: { fontSize: 13, fontWeight: '700' },
  bbTrack: { height: 8, backgroundColor: Colors.border.light, borderRadius: 4, overflow: 'hidden' },
  bbFill: { height: 8, borderRadius: 4 },
  breakdownNote: { fontSize: 11, color: Colors.text.tertiary, marginTop: 14, textAlign: 'center' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 },
  tipIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  tipText: { flex: 1, fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
});
