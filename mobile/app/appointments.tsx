import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { appointmentAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

const DEMO_APPOINTMENTS = [
  {
    id: '1',
    title: 'Call with Dr. Patel',
    description: 'Post-op review · 15 min',
    dateTime: new Date(Date.now() + 3 * 86400000).toISOString(),
    duration: 15,
    type: 'video',
  },
  {
    id: '2',
    title: 'Follow-up Visit',
    description: 'In-person checkup at Mercy General',
    dateTime: new Date(Date.now() + 10 * 86400000).toISOString(),
    duration: 30,
    type: 'in-person',
  },
  {
    id: '3',
    title: 'Lab Work',
    description: 'Blood panel & wound culture',
    dateTime: new Date(Date.now() + 12 * 86400000).toISOString(),
    duration: 20,
    type: 'lab',
  },
];

function getAppointmentIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('call') || t.includes('video')) return { name: 'videocam', color: Colors.semantic.info, bg: Colors.semantic.infoLight };
  if (t.includes('lab') || t.includes('blood')) return { name: 'flask', color: Colors.semantic.warning, bg: Colors.semantic.warningLight };
  return { name: 'location', color: Colors.primary.teal, bg: 'rgba(26,158,143,0.12)' };
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await appointmentAPI.getUpcoming();
      setAppointments(r.data?.length ? r.data : DEMO_APPOINTMENTS);
    } catch {
      setAppointments(DEMO_APPOINTMENTS);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // Group by date
  const grouped: Record<string, any[]> = {};
  appointments.forEach(apt => {
    const key = new Date(apt.dateTime).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(apt);
  });

  const nextApt = appointments[0];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Appointments</Text>
          <Text style={s.subtitle}>{appointments.length} upcoming</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {/* Next appointment highlight */}
        {nextApt && (
          <LinearGradient
            colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]}
            style={s.nextCard}
          >
            <Text style={s.nextLabel}>NEXT APPOINTMENT</Text>
            <Text style={s.nextTitle}>{nextApt.title}</Text>
            <Text style={s.nextDesc}>{nextApt.description}</Text>
            <View style={s.nextMeta}>
              <View style={s.nextMetaItem}>
                <Ionicons name="calendar" size={16} color={Colors.primary.tealLight} />
                <Text style={s.nextMetaText}>{formatFullDate(nextApt.dateTime)}</Text>
              </View>
              <View style={s.nextMetaItem}>
                <Ionicons name="time" size={16} color={Colors.primary.tealLight} />
                <Text style={s.nextMetaText}>{formatTime(nextApt.dateTime)} · {nextApt.duration} min</Text>
              </View>
            </View>
            <View style={s.nextCountdown}>
              <Text style={s.nextCountdownText}>{daysUntil(nextApt.dateTime)}</Text>
            </View>
          </LinearGradient>
        )}

        {/* All appointments */}
        {Object.entries(grouped).map(([dateKey, apts]) => (
          <View key={dateKey}>
            <Text style={s.dateHeader}>{formatFullDate(apts[0].dateTime)}</Text>
            {apts.map((apt) => {
              const icon = getAppointmentIcon(apt.title);
              return (
                <View key={apt.id} style={s.aptCard}>
                  <View style={s.aptTimeline}>
                    <View style={[s.aptDot, { backgroundColor: icon.color }]} />
                    <View style={s.aptLine} />
                  </View>
                  <View style={s.aptContent}>
                    <View style={s.aptHeader}>
                      <View style={[s.aptIcon, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.aptTitle}>{apt.title}</Text>
                        <Text style={s.aptDesc}>{apt.description}</Text>
                      </View>
                      <View style={s.aptBadge}>
                        <Text style={s.aptBadgeText}>{daysUntil(apt.dateTime)}</Text>
                      </View>
                    </View>
                    <View style={s.aptDetails}>
                      <View style={s.aptDetailItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                        <Text style={s.aptDetailText}>{formatTime(apt.dateTime)}</Text>
                      </View>
                      <View style={s.aptDetailItem}>
                        <Ionicons name="hourglass-outline" size={14} color={Colors.text.tertiary} />
                        <Text style={s.aptDetailText}>{apt.duration} min</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {appointments.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.border.medium} />
            <Text style={s.emptyText}>No upcoming appointments</Text>
            <Text style={s.emptySubtext}>Your care team will schedule them for you</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  nextCard: { marginHorizontal: 16, borderRadius: 20, padding: 24, marginBottom: 16 },
  nextLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 8 },
  nextTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  nextDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  nextMeta: { gap: 8 },
  nextMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextMetaText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  nextCountdown: { marginTop: 16, backgroundColor: 'rgba(26,158,143,0.2)', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  nextCountdownText: { color: Colors.primary.tealLight, fontSize: 14, fontWeight: '600' },
  dateHeader: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, letterSpacing: 0.3, marginLeft: 24, marginTop: 16, marginBottom: 8 },
  aptCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 2 },
  aptTimeline: { width: 24, alignItems: 'center', paddingTop: 18 },
  aptDot: { width: 10, height: 10, borderRadius: 5 },
  aptLine: { width: 2, flex: 1, backgroundColor: Colors.border.light, marginTop: 4 },
  aptContent: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 8, marginLeft: 8, ...Shadow.sm },
  aptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  aptIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aptTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  aptDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  aptBadge: { backgroundColor: Colors.background.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aptBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary.teal },
  aptDetails: { flexDirection: 'row', gap: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border.light },
  aptDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aptDetailText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.text.secondary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.text.tertiary, marginTop: 4 },
});
