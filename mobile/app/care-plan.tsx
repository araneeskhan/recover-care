import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Animated, Dimensions, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { taskAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

const { width: SW } = Dimensions.get('window');

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  WOUND_CARE:    { label: 'Wound Care',    icon: 'bandage',        color: '#E74C3C' },
  MEDICATION:    { label: 'Medication',    icon: 'medical',        color: '#E67E22' },
  ACTIVITY:      { label: 'Activity',      icon: 'walk',           color: '#27AE60' },
  NUTRITION:     { label: 'Nutrition',     icon: 'nutrition',      color: '#F2994A' },
  FOLLOW_UP:     { label: 'Follow-Up',     icon: 'calendar',       color: '#3498DB' },
  MENTAL_HEALTH: { label: 'Mental Health', icon: 'heart',          color: '#9B59B6' },
};

const MOOD_OPTIONS = [
  { key: 'amazing',  emoji: '🤩', label: 'Amazing' },
  { key: 'good',     emoji: '😊', label: 'Good' },
  { key: 'okay',     emoji: '😐', label: 'Okay' },
  { key: 'low',      emoji: '😔', label: 'Low' },
  { key: 'terrible', emoji: '😣', label: 'Terrible' },
];

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_TODAY = {
  dayNumber: 7,
  totalCompleted: 4,
  totalTasks: 18,
  overallProgress: 44,
  tasks: [
    { id: '1', category: 'WOUND_CARE',    title: '1-week wound inspection',     description: 'Check that edges are well-approximated. Look for swelling and redness extending > 1 cm from suture line.', isCompleted: true,  dayNumber: 7 },
    { id: '2', category: 'FOLLOW_UP',     title: '1-week check-in with care team', description: 'Prepare questions for your nurse or doctor. Document all current symptoms in the app.', isCompleted: false, dayNumber: 7 },
    { id: '3', category: 'WOUND_CARE',    title: 'Photo document incision',     description: 'Take a clear, well-lit photo for your wound journal. Compare with Day 3 photo.', isCompleted: false, dayNumber: 7 },
    { id: '4', category: 'ACTIVITY',      title: 'Walk 15 minutes',             description: 'If feeling well, extend today\'s walk. Bring a companion. Stop if pain > 5/10.', isCompleted: true,  dayNumber: 7 },
    { id: '5', category: 'MEDICATION',    title: 'Morning medications',         description: 'Take all prescribed morning medications with food and a full glass of water.', isCompleted: true,  dayNumber: 7 },
    { id: '6', category: 'MENTAL_HEALTH', title: 'Recovery journal entry',      description: 'Write about how you feel today. Express anything on your mind — your care team can read your notes.',  isCompleted: false, dayNumber: 7 },
  ],
};

const DEMO_JOURNAL = [
  { id: '1', content: 'Slept better last night for the first time. Still some tightness near the incision when I bend forward.', mood: 'good', energyLevel: 6, sleepHours: 7, sentimentScore: 0.3, flaggedKeywords: ['pain'], createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', content: 'Took a walk outside today — made it to the end of the block! A bit dizzy at first.', mood: 'good', energyLevel: 7, sleepHours: 6.5, sentimentScore: 0.5, flaggedKeywords: ['dizzy'], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const sw = 8, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const color = pct >= 75 ? '#27AE60' : pct >= 40 ? '#F2994A' : '#E74C3C';
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color + '25'} strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color }}>{pct}%</Text>
      </View>
    </View>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle }: { task: any; onToggle: (id: string) => void }) {
  const meta = CATEGORY_META[task.category] || CATEGORY_META.WOUND_CARE;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start(() => onToggle(task.id));
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[cp.taskCard, task.isCompleted && cp.taskCardDone]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[cp.taskCheck, task.isCompleted && { backgroundColor: meta.color, borderColor: meta.color }]}>
          {task.isCompleted && <Ionicons name="checkmark" size={14} color="#FFF" />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={cp.taskHeader}>
            <View style={[cp.catBadge, { backgroundColor: meta.color + '18' }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[cp.catLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={[cp.taskTitle, task.isCompleted && cp.taskTitleDone]}>{task.title}</Text>
          {task.description && (
            <Text style={cp.taskDesc} numberOfLines={task.isCompleted ? 1 : 3}>{task.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Journal Entry Card ───────────────────────────────────────────────────────
function JournalCard({ entry }: { entry: any }) {
  const d = new Date(entry.createdAt);
  const mood = MOOD_OPTIONS.find(m => m.key === entry.mood);
  const hasConcerns = (entry.flaggedKeywords || []).length > 0;
  const sentiment = entry.sentimentScore ?? 0;
  const sentColor = sentiment > 0.2 ? '#27AE60' : sentiment < -0.2 ? '#E74C3C' : '#F2994A';

  return (
    <View style={[cp.jCard, hasConcerns && { borderLeftWidth: 3, borderLeftColor: '#E67E22' }]}>
      <View style={cp.jCardHeader}>
        <View style={{ gap: 2 }}>
          <Text style={cp.jDate}>{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
          <Text style={cp.jTime}>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {mood && <Text style={{ fontSize: 22 }}>{mood.emoji}</Text>}
          <View style={[cp.sentBadge, { backgroundColor: sentColor + '18' }]}>
            <Text style={[cp.sentText, { color: sentColor }]}>
              {sentiment > 0.2 ? 'Positive' : sentiment < -0.2 ? 'Concerning' : 'Neutral'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={cp.jContent} numberOfLines={3}>{entry.content}</Text>
      {hasConcerns && (
        <View style={cp.jFlags}>
          <Ionicons name="alert-circle-outline" size={12} color="#E67E22" />
          <Text style={cp.jFlagText}>Keywords flagged: {entry.flaggedKeywords.join(', ')}</Text>
        </View>
      )}
      <View style={cp.jStats}>
        {entry.energyLevel != null && (
          <View style={cp.jStat}>
            <Ionicons name="flash" size={11} color={Colors.semantic.warning} />
            <Text style={cp.jStatText}>Energy {entry.energyLevel}/10</Text>
          </View>
        )}
        {entry.sleepHours != null && (
          <View style={cp.jStat}>
            <Ionicons name="moon" size={11} color={Colors.primary.teal} />
            <Text style={cp.jStatText}>{entry.sleepHours}h sleep</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── New Journal Form ─────────────────────────────────────────────────────────
function JournalForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState('7');
  const [anxiety, setAnxiety] = useState(3);
  const [gratitude, setGratitude] = useState('');

  const canSubmit = content.trim().length >= 10;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={cp.jForm}>
        <View style={cp.jFormHeader}>
          <Text style={cp.jFormTitle}>New Journal Entry</Text>
          <TouchableOpacity onPress={onCancel}><Ionicons name="close" size={22} color={Colors.text.secondary} /></TouchableOpacity>
        </View>

        <Text style={cp.jFormLabel}>How are you feeling today?</Text>
        <View style={cp.moodRow}>
          {MOOD_OPTIONS.map(m => (
            <TouchableOpacity key={m.key} style={[cp.moodBtn, mood === m.key && cp.moodBtnActive]} onPress={() => setMood(m.key)}>
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              <Text style={[cp.moodBtnLabel, mood === m.key && { color: Colors.primary.teal }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={cp.jFormLabel}>Your thoughts *</Text>
        <TextInput
          style={cp.jInput}
          multiline
          placeholder="How did today go? Any symptoms, improvements, or concerns to note…"
          placeholderTextColor={Colors.neutral.mediumGray}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />
        <Text style={{ fontSize: 11, color: content.length < 10 ? Colors.semantic.error : Colors.text.tertiary, marginBottom: 12 }}>
          {content.length} characters {content.length < 10 ? `(minimum 10)` : ''}
        </Text>

        {/* Quick metrics */}
        <View style={cp.metricsRow}>
          <View style={cp.metricBox}>
            <Text style={cp.metricLabel}>Energy (1-10)</Text>
            <View style={cp.metricBtns}>
              {[1,2,3,4,5,6,7,8,9,10].map(v => (
                <TouchableOpacity key={v} onPress={() => setEnergy(v)}
                  style={[cp.metricBtn, energy === v && { backgroundColor: Colors.primary.teal, borderColor: Colors.primary.teal }]}>
                  <Text style={[cp.metricBtnText, energy === v && { color: '#FFF' }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={cp.jFormLabel}>Sleep (hours)</Text>
            <TextInput style={cp.smallInput} value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" placeholder="7.0" placeholderTextColor={Colors.neutral.mediumGray} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cp.jFormLabel}>Anxiety (1-10)</Text>
            <TextInput style={cp.smallInput} value={String(anxiety)} onChangeText={v => setAnxiety(Number(v) || 1)} keyboardType="number-pad" placeholder="3" placeholderTextColor={Colors.neutral.mediumGray} />
          </View>
        </View>

        <Text style={cp.jFormLabel}>One thing you're grateful for (optional)</Text>
        <TextInput style={cp.smallInput} value={gratitude} onChangeText={setGratitude} placeholder="e.g. My family's support" placeholderTextColor={Colors.neutral.mediumGray} />

        <TouchableOpacity
          style={[cp.jSubmitBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={() => canSubmit && onSubmit({ content, mood, energyLevel: energy, sleepHours: parseFloat(sleep) || undefined, anxietyLevel: anxiety, gratitude: gratitude || undefined })}
          disabled={!canSubmit}
        >
          <LinearGradient colors={[Colors.background.tealGradientStart, Colors.background.tealGradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cp.jSubmitGrad}>
            <Ionicons name="create" size={18} color="#FFF" />
            <Text style={cp.jSubmitText}>Save Journal Entry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CarePlanScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'tasks' | 'week' | 'journal'>('tasks');
  const [todayData, setTodayData] = useState<any>(null);
  const [weekData, setWeekData] = useState<any>(null);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [td, wd, jd] = await Promise.all([taskAPI.getToday(), taskAPI.getWeek(), taskAPI.getJournal()]);
      setTodayData(td.data);
      setTasks(td.data.tasks || []);
      setWeekData(wd.data);
      setJournalData(jd.data || []);
    } catch {
      setTodayData(DEMO_TODAY);
      setTasks(DEMO_TODAY.tasks);
      setWeekData(null);
      setJournalData(DEMO_JOURNAL);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const toggleTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
    try { await taskAPI.complete(id); } catch { /* optimistic update already done */ }
  };

  const submitJournal = async (data: any) => {
    try {
      const r = await taskAPI.addJournal(data);
      setJournalData(prev => [r.data, ...prev]);
      setShowJournalForm(false);
    } catch {
      setJournalData(prev => [{ id: Date.now().toString(), ...data, sentimentScore: 0, flaggedKeywords: [], createdAt: new Date().toISOString() }, ...prev]);
      setShowJournalForm(false);
    }
  };

  const td = todayData || DEMO_TODAY;
  const completed = tasks.filter(t => t.isCompleted).length;
  const totalToday = tasks.length;
  const pct = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;

  // Group week tasks by day
  const weekTasks = weekData?.tasks || [];
  const currentDay = weekData?.currentDay || td.dayNumber;
  const byDay: Record<number, any[]> = {};
  weekTasks.forEach((t: any) => { if (!byDay[t.dayNumber]) byDay[t.dayNumber] = []; byDay[t.dayNumber].push(t); });
  const dayKeys = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  return (
    <View style={cp.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={cp.header}>
        <TouchableOpacity onPress={() => router.back()} style={cp.back}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={cp.title}>Recovery Care Plan</Text>
          <Text style={cp.subtitle}>Day {td.dayNumber} · {td.overallProgress}% complete overall</Text>
        </View>
        <ProgressRing pct={td.overallProgress} size={56} />
      </LinearGradient>

      {/* Today's summary bar */}
      <View style={cp.summaryBar}>
        <View style={[cp.summaryCell, { borderRightWidth: 1, borderRightColor: Colors.border.light }]}>
          <Text style={cp.summaryCellVal}>{completed}/{totalToday}</Text>
          <Text style={cp.summaryCellLabel}>Today done</Text>
        </View>
        <View style={[cp.summaryCell, { borderRightWidth: 1, borderRightColor: Colors.border.light }]}>
          <Text style={[cp.summaryCellVal, { color: Colors.primary.teal }]}>{pct}%</Text>
          <Text style={cp.summaryCellLabel}>Today progress</Text>
        </View>
        <View style={cp.summaryCell}>
          <Text style={[cp.summaryCellVal, { color: Colors.semantic.info }]}>{journalData.length}</Text>
          <Text style={cp.summaryCellLabel}>Journal entries</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={cp.tabs}>
        {(['tasks', 'week', 'journal'] as const).map(t => (
          <TouchableOpacity key={t} style={[cp.tab, tab === t && cp.tabActive]} onPress={() => setTab(t)}>
            <Ionicons name={t === 'tasks' ? 'checkmark-circle' : t === 'week' ? 'calendar' : 'journal'} size={15}
              color={tab === t ? Colors.primary.teal : Colors.text.secondary} />
            <Text style={[cp.tabText, tab === t && cp.tabTextActive]}>
              {t === 'tasks' ? 'Today' : t === 'week' ? 'This Week' : 'Journal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {/* ─── Today's Tasks ─── */}
        {tab === 'tasks' && (
          <View style={{ paddingBottom: 32 }}>
            {tasks.length === 0 ? (
              <View style={cp.empty}>
                <Ionicons name="checkmark-done-circle" size={48} color={Colors.primary.teal} />
                <Text style={cp.emptyTitle}>No tasks today!</Text>
                <Text style={cp.emptySub}>Your care team hasn't scheduled any tasks for today yet.</Text>
              </View>
            ) : (
              <>
                {/* Category summary */}
                <View style={cp.catRow}>
                  {Object.entries(CATEGORY_META).filter(([cat]) => tasks.some(t => t.category === cat)).map(([cat, meta]) => {
                    const count = tasks.filter(t => t.category === cat).length;
                    const done  = tasks.filter(t => t.category === cat && t.isCompleted).length;
                    return (
                      <View key={cat} style={[cp.catPill, { borderColor: meta.color + '40' }]}>
                        <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                        <Text style={[cp.catPillText, { color: meta.color }]}>{done}/{count}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Progress message */}
                {pct === 100 && (
                  <View style={cp.allDone}>
                    <Text style={{ fontSize: 24 }}>🎉</Text>
                    <View>
                      <Text style={cp.allDoneTitle}>All tasks complete!</Text>
                      <Text style={cp.allDoneSub}>Excellent work on Day {td.dayNumber}.</Text>
                    </View>
                  </View>
                )}

                {tasks.map(task => <TaskCard key={task.id} task={task} onToggle={toggleTask} />)}
              </>
            )}
          </View>
        )}

        {/* ─── Weekly View ─── */}
        {tab === 'week' && (
          <View style={{ paddingBottom: 32 }}>
            {dayKeys.length === 0 ? (
              <View style={cp.empty}>
                <Ionicons name="calendar-outline" size={48} color={Colors.text.tertiary} />
                <Text style={cp.emptyTitle}>No tasks scheduled this week</Text>
                <Text style={cp.emptySub}>Ask your care team to set up your recovery plan.</Text>
              </View>
            ) : dayKeys.map(day => {
              const dayTasks = byDay[day];
              const doneCount = dayTasks.filter((t: any) => t.isCompleted).length;
              const isToday = day === currentDay;
              const isPast  = day < currentDay;
              return (
                <View key={day} style={cp.weekDay}>
                  <View style={[cp.weekDayLabel, isToday && { backgroundColor: Colors.primary.teal }]}>
                    <Text style={[cp.weekDayNum, isToday && { color: '#FFF' }]}>Day</Text>
                    <Text style={[cp.weekDayNumBig, isToday && { color: '#FFF' }]}>{day}</Text>
                    {isToday && <Text style={[cp.weekTodayTag]}>TODAY</Text>}
                    {isPast && <Text style={[cp.weekPastTag]}>{doneCount}/{dayTasks.length}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    {dayTasks.map((task: any) => {
                      const meta = CATEGORY_META[task.category] || CATEGORY_META.WOUND_CARE;
                      return (
                        <View key={task.id} style={[cp.weekTask, task.isCompleted && { opacity: 0.55 }]}>
                          <View style={[cp.weekTaskDot, { backgroundColor: task.isCompleted ? Colors.semantic.success : meta.color }]}>
                            <Ionicons name={task.isCompleted ? 'checkmark' : meta.icon as any} size={10} color="#FFF" />
                          </View>
                          <Text style={cp.weekTaskTitle} numberOfLines={1}>{task.title}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── Journal ─── */}
        {tab === 'journal' && (
          <View style={{ paddingBottom: 32 }}>
            {showJournalForm ? (
              <JournalForm onSubmit={submitJournal} onCancel={() => setShowJournalForm(false)} />
            ) : (
              <>
                <TouchableOpacity style={cp.newJournalBtn} onPress={() => setShowJournalForm(true)}>
                  <LinearGradient colors={[Colors.background.tealGradientStart, Colors.background.tealGradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cp.newJournalGrad}>
                    <Ionicons name="create-outline" size={20} color="#FFF" />
                    <Text style={cp.newJournalText}>Write Today's Entry</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {journalData.length > 0 && (
                  <View style={cp.jInsightCard}>
                    <Text style={cp.jInsightTitle}>Sentiment Over Time</Text>
                    <View style={cp.jSentBar}>
                      {journalData.slice().reverse().map((e, i) => {
                        const s = e.sentimentScore ?? 0;
                        const color = s > 0.2 ? '#27AE60' : s < -0.2 ? '#E74C3C' : '#F2994A';
                        return <View key={i} style={[cp.jSentCell, { backgroundColor: color, opacity: 0.3 + (i / journalData.length) * 0.7 }]} />;
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: Colors.text.tertiary }}>Oldest</Text>
                      <Text style={{ fontSize: 10, color: Colors.text.tertiary }}>Latest</Text>
                    </View>
                  </View>
                )}

                {journalData.length === 0 ? (
                  <View style={cp.empty}>
                    <Ionicons name="journal-outline" size={48} color={Colors.text.tertiary} />
                    <Text style={cp.emptyTitle}>No journal entries yet</Text>
                    <Text style={cp.emptySub}>Writing about your recovery helps your care team understand how you're feeling beyond just vitals.</Text>
                  </View>
                ) : journalData.map(e => <JournalCard key={e.id} entry={e} />)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const cp = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  summaryBar: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -16, borderRadius: 16, ...Shadow.md },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  summaryCellVal: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  summaryCellLabel: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: '#FFF', borderRadius: 12, padding: 4, ...Shadow.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
  tabActive: { backgroundColor: 'rgba(26,158,143,0.1)' },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  tabTextActive: { color: Colors.primary.teal, fontWeight: '700' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1 },
  catPillText: { fontSize: 12, fontWeight: '600' },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.semantic.successLight, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 },
  allDoneTitle: { fontSize: 15, fontWeight: '700', color: Colors.semantic.success },
  allDoneSub: { fontSize: 13, color: Colors.semantic.success, opacity: 0.8 },
  taskCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', ...Shadow.sm, borderWidth: 1.5, borderColor: Colors.border.light },
  taskCardDone: { opacity: 0.65, borderColor: Colors.semantic.success + '40', backgroundColor: Colors.semantic.successLight + '40' },
  taskCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border.medium, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  taskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  catLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, lineHeight: 21 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  taskDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 4, lineHeight: 19 },
  weekDay: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12 },
  weekDayLabel: { width: 60, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, ...Shadow.sm },
  weekDayNum: { fontSize: 10, fontWeight: '600', color: Colors.text.tertiary },
  weekDayNumBig: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
  weekTodayTag: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5, marginTop: 2 },
  weekPastTag: { fontSize: 10, fontWeight: '600', color: Colors.semantic.success, marginTop: 2 },
  weekTask: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 10, padding: 10, marginBottom: 6, ...Shadow.sm },
  weekTaskDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  weekTaskTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  newJournalBtn: { margin: 16, borderRadius: 14, overflow: 'hidden', ...Shadow.md },
  newJournalGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  newJournalText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  jInsightCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12, ...Shadow.sm },
  jInsightTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8 },
  jSentBar: { flexDirection: 'row', gap: 3, height: 16 },
  jSentCell: { flex: 1, borderRadius: 3 },
  jCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 16, ...Shadow.sm },
  jCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  jDate: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  jTime: { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  sentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sentText: { fontSize: 11, fontWeight: '700' },
  jContent: { fontSize: 14, color: Colors.text.secondary, lineHeight: 21, marginBottom: 8 },
  jFlags: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  jFlagText: { fontSize: 11, color: '#E67E22', fontWeight: '500', flex: 1 },
  jStats: { flexDirection: 'row', gap: 12 },
  jStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jStatText: { fontSize: 11, color: Colors.text.tertiary },
  jForm: { backgroundColor: '#FFF', margin: 16, borderRadius: 20, padding: 20, ...Shadow.md },
  jFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  jFormTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  jFormLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8, marginTop: 4 },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background.primary, borderWidth: 1.5, borderColor: Colors.border.light },
  moodBtnActive: { borderColor: Colors.primary.teal, backgroundColor: 'rgba(26,158,143,0.06)' },
  moodBtnLabel: { fontSize: 10, fontWeight: '600', color: Colors.text.secondary, marginTop: 3 },
  jInput: { backgroundColor: Colors.background.primary, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text.primary, minHeight: 100, borderWidth: 1, borderColor: Colors.border.light, lineHeight: 21 },
  metricsRow: { marginBottom: 12 },
  metricBox: { marginBottom: 8 },
  metricLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 6 },
  metricBtns: { flexDirection: 'row', gap: 5 },
  metricBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border.light, backgroundColor: Colors.background.primary, justifyContent: 'center', alignItems: 'center' },
  metricBtnText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },
  smallInput: { backgroundColor: Colors.background.primary, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border.light, marginBottom: 12 },
  jSubmitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  jSubmitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  jSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  emptySub: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20 },
});
