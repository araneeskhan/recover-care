import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { medicationAPI, appointmentAPI, taskAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderType = 'medication' | 'task' | 'appointment' | 'checkin';
type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'anytime';

interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  time?: string;      // ISO or HH:MM
  timeBlock: TimeBlock;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  icon: string;
  color: string;
  actionLabel?: string;
  route?: string;
}

// ─── Time utilities ───────────────────────────────────────────────────────────

function getTimeBlock(dateStr?: string): TimeBlock {
  if (!dateStr) return 'anytime';
  const d = new Date(dateStr);
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function relTime(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const m = Math.round(diff / 60000);
  const h = Math.round(diff / 3600000);
  if (diff < 0)     return 'overdue';
  if (m < 60)       return `in ${m}m`;
  if (h < 24)       return `in ${h}h`;
  const d = Math.ceil(diff / 86400000);
  return `in ${d}d`;
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

// ─── Build reminders from API data ───────────────────────────────────────────

function buildReminders(meds: any[], appointments: any[], tasks: any[], hasCheckedInToday: boolean): Reminder[] {
  const all: Reminder[] = [];
  const now = new Date();
  const today = now.toDateString();

  // ── Check-in reminder ──
  if (!hasCheckedInToday) {
    all.push({
      id: 'checkin-today',
      type: 'checkin',
      title: "Complete today's check-in",
      subtitle: 'Takes 2 minutes · Keeps your care team informed',
      timeBlock: now.getHours() < 10 ? 'morning' : 'anytime',
      priority: 'high',
      done: false,
      icon: 'clipboard',
      color: Colors.primary.teal,
      actionLabel: 'Start Check-In',
      route: '/(tabs)/checkin',
    });
  }

  // ── Medication reminders ──
  for (const med of meds) {
    if (!med.isActive) continue;
    const isPRN = med.frequency?.includes('needed');
    if (isPRN) continue;

    const hasTodayLog = (med.logs || []).some((l: any) => new Date(l.takenAt).toDateString() === today);

    all.push({
      id: `med-${med.id}`,
      type: 'medication',
      title: `Take ${med.name}`,
      subtitle: `${med.dosage} · ${med.frequency}`,
      time: med.nextDoseAt || undefined,
      timeBlock: med.nextDoseAt ? getTimeBlock(med.nextDoseAt) : 'anytime',
      priority: isOverdue(med.nextDoseAt) ? 'high' : 'medium',
      done: hasTodayLog,
      icon: 'medical',
      color: Colors.semantic.warning,
      actionLabel: 'Mark Taken',
      route: '/medications',
    });
  }

  // ── Task reminders ──
  for (const task of tasks) {
    const catColors: Record<string, string> = {
      WOUND_CARE: '#E74C3C', MEDICATION: '#E67E22', ACTIVITY: '#27AE60',
      NUTRITION: '#F2994A', FOLLOW_UP: '#3498DB', MENTAL_HEALTH: '#9B59B6',
    };
    const catIcons: Record<string, string> = {
      WOUND_CARE: 'bandage', MEDICATION: 'medical', ACTIVITY: 'walk',
      NUTRITION: 'nutrition', FOLLOW_UP: 'calendar', MENTAL_HEALTH: 'heart',
    };
    all.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      subtitle: task.description ? task.description.slice(0, 60) + (task.description.length > 60 ? '…' : '') : 'Recovery care plan task',
      timeBlock: task.category === 'MEDICATION' ? 'morning' : task.category === 'MENTAL_HEALTH' ? 'evening' : 'anytime',
      priority: task.category === 'WOUND_CARE' || task.category === 'FOLLOW_UP' ? 'high' : 'medium',
      done: task.isCompleted,
      icon: catIcons[task.category] || 'checkmark-circle',
      color: catColors[task.category] || Colors.primary.teal,
      actionLabel: task.isCompleted ? undefined : 'Complete',
      route: '/care-plan',
    });
  }

  // ── Appointment reminders ──
  for (const appt of appointments) {
    const apptDate = new Date(appt.dateTime);
    const isToday = apptDate.toDateString() === today;
    const isTomorrow = apptDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
    if (!isToday && !isTomorrow) continue;

    all.push({
      id: `appt-${appt.id}`,
      type: 'appointment',
      title: appt.title,
      subtitle: isToday ? `Today at ${fmtTime(appt.dateTime)}` : `Tomorrow at ${fmtTime(appt.dateTime)}`,
      time: appt.dateTime,
      timeBlock: getTimeBlock(appt.dateTime),
      priority: isToday && isOverdue(appt.dateTime) ? 'high' : isToday ? 'high' : 'medium',
      done: false,
      icon: 'calendar',
      color: Colors.semantic.info,
      route: '/appointments',
    });
  }

  return all;
}

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ reminder, onAction }: { reminder: Reminder; onAction: (r: Reminder) => void }) {
  const scaleRef = React.useRef(new Animated.Value(1)).current;
  const overdue = reminder.time && isOverdue(reminder.time) && !reminder.done;

  const press = () => {
    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => onAction(reminder));
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleRef }] }}>
      <View style={[
        rm.card,
        reminder.done && rm.cardDone,
        overdue && { borderLeftWidth: 3, borderLeftColor: Colors.semantic.error },
        reminder.priority === 'high' && !reminder.done && !overdue && { borderLeftWidth: 3, borderLeftColor: reminder.color },
      ]}>
        <View style={[rm.iconWrap, { backgroundColor: reminder.done ? Colors.semantic.successLight : reminder.color + '18' }]}>
          <Ionicons name={reminder.done ? 'checkmark-circle' : reminder.icon as any} size={22}
            color={reminder.done ? Colors.semantic.success : reminder.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[rm.cardTitle, reminder.done && rm.cardTitleDone]} numberOfLines={1}>{reminder.title}</Text>
            {overdue && (
              <View style={rm.overdueBadge}>
                <Text style={rm.overdueText}>OVERDUE</Text>
              </View>
            )}
          </View>
          <Text style={rm.cardSub} numberOfLines={2}>{reminder.subtitle}</Text>
          {reminder.time && !reminder.done && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="time-outline" size={12} color={overdue ? Colors.semantic.error : Colors.text.tertiary} />
              <Text style={[rm.cardTime, overdue && { color: Colors.semantic.error }]}>
                {fmtTime(reminder.time)} · {relTime(reminder.time)}
              </Text>
            </View>
          )}
        </View>
        {reminder.actionLabel && !reminder.done && (
          <TouchableOpacity style={[rm.actionBtn, { backgroundColor: reminder.color }]} onPress={press}>
            <Text style={rm.actionText}>{reminder.actionLabel}</Text>
          </TouchableOpacity>
        )}
        {reminder.done && (
          <View style={rm.doneTag}>
            <Ionicons name="checkmark" size={13} color={Colors.semantic.success} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_MEDS = [
  { id: '1', name: 'Amoxicillin', dosage: '500 mg', frequency: '3× daily', isActive: true, nextDoseAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), logs: [] },
  { id: '2', name: 'Ibuprofen',   dosage: '400 mg', frequency: '3× daily', isActive: true, nextDoseAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), logs: [{ takenAt: new Date(new Date().setHours(8, 5, 0, 0)).toISOString() }] },
  { id: '3', name: 'Pantoprazole',dosage: '40 mg',  frequency: 'Once daily · morning', isActive: true, nextDoseAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), logs: [{ takenAt: new Date(new Date().setHours(8, 2, 0, 0)).toISOString() }] },
];
const DEMO_APPTS = [
  { id: '1', title: 'Follow-up with Dr. Patel', description: 'Post-op review', dateTime: new Date(Date.now() + 86400000 * 2).toISOString() },
];
const DEMO_TASKS = [
  { id: 't1', category: 'WOUND_CARE',    title: 'Inspect and clean incision site', description: 'Check for redness, swelling or discharge.', isCompleted: true },
  { id: 't2', category: 'ACTIVITY',      title: 'Walk 15 minutes outdoors',         description: 'Gentle activity to aid circulation.',  isCompleted: false },
  { id: 't3', category: 'MENTAL_HEALTH', title: 'Write a journal entry',            description: 'Reflect on how you feel today.',        isCompleted: false },
];

const TIME_BLOCK_META: Record<TimeBlock, { label: string; icon: string; color: string; range: string }> = {
  morning:   { label: 'Morning',   icon: 'sunny',      color: '#F2994A', range: '6 AM – 12 PM' },
  afternoon: { label: 'Afternoon', icon: 'partly-sunny', color: '#F39C12', range: '12 PM – 5 PM' },
  evening:   { label: 'Evening',   icon: 'moon',       color: '#8E44AD', range: '5 PM – 10 PM' },
  anytime:   { label: 'Any Time',  icon: 'time',       color: Colors.primary.teal, range: 'No specific time' },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const load = useCallback(async () => {
    try {
      const [medsR, apptsR, tasksR] = await Promise.all([
        medicationAPI.getAll(),
        appointmentAPI.getUpcoming(),
        taskAPI.getToday(),
      ]);
      const built = buildReminders(
        medsR.data.medications || [],
        apptsR.data || [],
        tasksR.data.tasks || [],
        false
      );
      setReminders(built);
    } catch {
      setReminders(buildReminders(DEMO_MEDS, DEMO_APPTS, DEMO_TASKS, false));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = (r: Reminder) => {
    if (r.route) router.push(r.route as any);
  };

  const displayed = reminders.filter(r =>
    filter === 'all' ? true : filter === 'done' ? r.done : !r.done
  );

  // Group by time block
  const blocks: TimeBlock[] = ['morning', 'afternoon', 'evening', 'anytime'];
  const grouped: Record<TimeBlock, Reminder[]> = { morning: [], afternoon: [], evening: [], anytime: [] };
  displayed.forEach(r => grouped[r.timeBlock].push(r));

  const totalPending  = reminders.filter(r => !r.done).length;
  const totalDone     = reminders.filter(r =>  r.done).length;
  const totalOverdue  = reminders.filter(r => !r.done && r.time && isOverdue(r.time)).length;
  const completionPct = reminders.length > 0 ? Math.round((totalDone / reminders.length) * 100) : 0;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={rm.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={rm.header}>
        <TouchableOpacity onPress={() => router.back()} style={rm.back}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={rm.greeting}>{greeting}</Text>
          <Text style={rm.headerTitle}>Today's Schedule</Text>
          <Text style={rm.headerDate}>{dateStr}</Text>
        </View>
        <View style={rm.completionRing}>
          <Text style={rm.completionPct}>{completionPct}%</Text>
          <Text style={rm.completionLabel}>done</Text>
        </View>
      </LinearGradient>

      {/* Stats strip */}
      <View style={rm.statsStrip}>
        <View style={[rm.statItem, { borderRightWidth: 1, borderRightColor: Colors.border.light }]}>
          <Text style={[rm.statVal, { color: Colors.semantic.error }]}>{totalOverdue}</Text>
          <Text style={rm.statLabel}>Overdue</Text>
        </View>
        <View style={[rm.statItem, { borderRightWidth: 1, borderRightColor: Colors.border.light }]}>
          <Text style={[rm.statVal, { color: Colors.text.primary }]}>{totalPending}</Text>
          <Text style={rm.statLabel}>Pending</Text>
        </View>
        <View style={rm.statItem}>
          <Text style={[rm.statVal, { color: Colors.semantic.success }]}>{totalDone}</Text>
          <Text style={rm.statLabel}>Done</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={rm.filterRow}>
        {(['all', 'pending', 'done'] as const).map(f => (
          <TouchableOpacity key={f} style={[rm.filterChip, filter === f && rm.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[rm.filterChipText, filter === f && rm.filterChipTextActive]}>
              {f === 'all' ? `All (${reminders.length})` : f === 'pending' ? `Pending (${totalPending})` : `Done (${totalDone})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {reminders.length === 0 ? (
          <View style={rm.empty}>
            <Ionicons name="checkmark-done-circle" size={56} color={Colors.primary.teal} />
            <Text style={rm.emptyTitle}>All clear!</Text>
            <Text style={rm.emptySub}>No reminders scheduled for today.</Text>
          </View>
        ) : (
          blocks.map(block => {
            const items = grouped[block];
            if (items.length === 0) return null;
            const meta = TIME_BLOCK_META[block];
            return (
              <View key={block} style={rm.blockSection}>
                <View style={rm.blockHeader}>
                  <View style={[rm.blockIconWrap, { backgroundColor: meta.color + '18' }]}>
                    <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                  </View>
                  <View>
                    <Text style={rm.blockLabel}>{meta.label}</Text>
                    <Text style={rm.blockRange}>{meta.range}</Text>
                  </View>
                  <View style={[rm.blockCount, { backgroundColor: meta.color + '18' }]}>
                    <Text style={[rm.blockCountText, { color: meta.color }]}>
                      {items.filter(i => i.done).length}/{items.length}
                    </Text>
                  </View>
                </View>
                {items.map(r => <ReminderCard key={r.id} reminder={r} onAction={handleAction} />)}
              </View>
            );
          })
        )}

        {/* Progress bar at bottom */}
        {reminders.length > 0 && (
          <View style={rm.progressSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={rm.progressLabel}>Daily Progress</Text>
              <Text style={[rm.progressLabel, { color: Colors.primary.teal }]}>{completionPct}%</Text>
            </View>
            <View style={rm.progressTrack}>
              <View style={[rm.progressFill, { width: `${completionPct}%` as any, backgroundColor: completionPct === 100 ? Colors.semantic.success : Colors.primary.teal }]} />
            </View>
            {completionPct === 100 && (
              <View style={rm.allDone}>
                <Text style={{ fontSize: 22 }}>🎉</Text>
                <Text style={rm.allDoneText}>All tasks complete for today!</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const rm = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  back: { width: 40, height: 40, justifyContent: 'center', marginTop: 4 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 2 },
  headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  completionRing: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: Colors.primary.teal, marginTop: 8 },
  completionPct: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  completionLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  statsStrip: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -16, borderRadius: 14, ...Shadow.md },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: Colors.border.light },
  filterChipActive: { backgroundColor: Colors.primary.teal, borderColor: Colors.primary.teal },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  filterChipTextActive: { color: '#FFF' },
  blockSection: { marginTop: 20 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  blockIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  blockLabel: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  blockRange: { fontSize: 11, color: Colors.text.tertiary, marginTop: 1 },
  blockCount: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  blockCountText: { fontSize: 12, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, ...Shadow.sm },
  cardDone: { opacity: 0.6, backgroundColor: Colors.semantic.successLight + '60' },
  iconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  cardTitleDone: { textDecorationLine: 'line-through', color: Colors.text.tertiary },
  cardSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 3, lineHeight: 16 },
  cardTime: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '500' },
  overdueBadge: { backgroundColor: Colors.semantic.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  overdueText: { fontSize: 9, fontWeight: '800', color: Colors.semantic.error, letterSpacing: 0.5 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 8 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  doneTag: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.semantic.successLight, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  progressSection: { marginHorizontal: 16, marginTop: 24, backgroundColor: '#FFF', borderRadius: 16, padding: 18, ...Shadow.sm },
  progressLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  progressTrack: { height: 10, backgroundColor: Colors.border.light, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  allDoneText: { fontSize: 14, fontWeight: '700', color: Colors.semantic.success },
  empty: { alignItems: 'center', padding: 48, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  emptySub: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
});
