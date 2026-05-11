import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
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

const SEVERITY_FILTERS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'None'];

export default function PatientsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');

  const load = useCallback(async (q?: string, sev?: string) => {
    try {
      const params: any = {};
      if (q) params.search = q;
      if (sev && sev !== 'All' && sev !== 'None') params.severity = sev;
      const res = await staffAPI.getPatients(params);
      let data = res.data;
      if (sev === 'None') data = data.filter((p: any) => !p.topAlertSeverity);
      setPatients(data);
    } catch (e) {
      console.log('Load patients error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(search, severityFilter); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(search, severityFilter);
    setRefreshing(false);
  };

  const onSearch = (text: string) => {
    setSearch(text);
    load(text, severityFilter);
  };

  const onFilter = (f: string) => {
    setSeverityFilter(f);
    load(search, f);
  };

  const renderPatient = ({ item: p }: { item: any }) => {
    const pct = Math.round((p.currentDay / p.totalDays) * 100);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: p.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: accentColor + '22' }]}>
            <Text style={[styles.avatarText, { color: accentColor }]}>{p.firstName[0]}{p.lastName[0]}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.patientName}>{p.firstName} {p.lastName}</Text>
            <Text style={styles.mrnText}>MRN {p.mrn}</Text>
          </View>
          <Text style={styles.surgeryText}>{p.surgeryType}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={12} color={Colors.text.secondary} />
              <Text style={styles.statText}>Day {p.currentDay}/{p.totalDays}</Text>
            </View>
            {p.latestPain !== null && (
              <View style={styles.stat}>
                <Ionicons name="pulse-outline" size={12} color={Colors.text.secondary} />
                <Text style={styles.statText}>Pain {p.latestPain}/10</Text>
              </View>
            )}
            {p.latestTemp !== null && (
              <View style={styles.stat}>
                <Ionicons name="thermometer-outline" size={12} color={Colors.text.secondary} />
                <Text style={styles.statText}>{p.latestTemp}°C</Text>
              </View>
            )}
          </View>
          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: accentColor }]} />
          </View>
        </View>
        <View style={styles.cardRight}>
          {p.topAlertSeverity ? (
            <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR[p.topAlertSeverity] + '22' }]}>
              <Ionicons name="warning" size={12} color={SEVERITY_COLOR[p.topAlertSeverity]} />
              <Text style={[styles.sevText, { color: SEVERITY_COLOR[p.topAlertSeverity] }]}>{p.topAlertSeverity}</Text>
            </View>
          ) : (
            <View style={[styles.sevBadge, { backgroundColor: Colors.semantic.successLight }]}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.semantic.success} />
              <Text style={[styles.sevText, { color: Colors.semantic.success }]}>OK</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.neutral.mediumGray} style={{ marginTop: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDoctor ? '#7F4A00' : '#4A235A' }]}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>{patients.length} assigned</Text>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.neutral.mediumGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, MRN, surgery..."
            placeholderTextColor={Colors.neutral.mediumGray}
            value={search}
            onChangeText={onSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.neutral.mediumGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Severity Filter */}
      <FlatList
        horizontal
        data={SEVERITY_FILTERS}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, severityFilter === f && { backgroundColor: accentColor }]}
            onPress={() => onFilter(f)}
          >
            {f !== 'All' && f !== 'None' && severityFilter !== f && (
              <View style={[styles.filterDot, { backgroundColor: SEVERITY_COLOR[f] ?? Colors.neutral.mediumGray }]} />
            )}
            <Text style={[styles.filterText, severityFilter === f && { color: '#FFF' }]}>{f}</Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={52} color={Colors.neutral.mediumGray} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  title: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text.primary },
  filterRow: { paddingHorizontal: Spacing.xl, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.background.card, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border.light,
  },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text.secondary },
  list: { padding: Spacing.xl, gap: 10 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg,
    padding: 14, alignItems: 'center', ...Shadow.md,
  },
  cardLeft: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  patientName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text.primary },
  mrnText: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  surgeryText: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: FontSize.xs, color: Colors.text.secondary },
  progressBg: { height: 3, backgroundColor: Colors.border.light, borderRadius: 2, marginTop: 8 },
  progressFill: { height: 3, borderRadius: 2 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  sevText: { fontSize: 9, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  emptyText: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
