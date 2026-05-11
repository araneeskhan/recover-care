import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { staffAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';

const SEV_COLOR: Record<string, string> = {
  CRITICAL: Colors.semantic.error,
  HIGH: Colors.semantic.warning,
  MEDIUM: '#F1C40F',
  LOW: Colors.semantic.info,
};
const SEV_BG: Record<string, string> = {
  CRITICAL: Colors.semantic.errorLight,
  HIGH: Colors.semantic.warningLight,
  MEDIUM: '#FEF9C3',
  LOW: Colors.semantic.infoLight,
};
const SEV_ICON: Record<string, string> = {
  CRITICAL: 'alert-circle',
  HIGH: 'warning',
  MEDIUM: 'information-circle',
  LOW: 'information',
};

const TABS = ['Active', 'Resolved', 'All'];
const SEV_FILTERS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function AlertsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('Active');
  const [sevFilter, setSevFilter] = useState('All');
  const [resolveModal, setResolveModal] = useState<{ visible: boolean; alertId: string; patientName: string } | null>(null);
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async (t: string, sev: string) => {
    try {
      const params: any = {};
      if (t === 'Active') params.resolved = false;
      if (t === 'Resolved') params.resolved = true;
      if (sev !== 'All') params.severity = sev;
      const res = await staffAPI.getAlerts(params);
      setAlerts(res.data);
    } catch (e) {
      console.log('Load alerts error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab, sevFilter); }, [load, tab, sevFilter]);

  const onRefresh = async () => { setRefreshing(true); await load(tab, sevFilter); setRefreshing(false); };

  const openResolve = (alert: any) => {
    setNote('');
    setResolveModal({ visible: true, alertId: alert.id, patientName: `${alert.patient?.firstName} ${alert.patient?.lastName}` });
  };

  const confirmResolve = async () => {
    if (!resolveModal) return;
    setResolving(true);
    try {
      await staffAPI.resolveAlert(resolveModal.alertId, note);
      setResolveModal(null);
      load(tab, sevFilter);
    } catch {
      Alert.alert('Error', 'Failed to resolve alert');
    } finally {
      setResolving(false);
    }
  };

  const critCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.isResolved).length;
  const highCount = alerts.filter(a => a.severity === 'HIGH' && !a.isResolved).length;

  const renderAlert = ({ item: a }: { item: any }) => (
    <View style={[styles.alertCard, { borderLeftColor: SEV_COLOR[a.severity] }]}>
      <View style={styles.alertTop}>
        <View style={[styles.sevBadge, { backgroundColor: SEV_BG[a.severity] }]}>
          <Ionicons name={SEV_ICON[a.severity] as any} size={14} color={SEV_COLOR[a.severity]} />
          <Text style={[styles.sevText, { color: SEV_COLOR[a.severity] }]}>{a.severity}</Text>
        </View>
        {a.isResolved ? (
          <View style={styles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.semantic.success} />
            <Text style={styles.resolvedText}>Resolved</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.resolveBtn, { borderColor: accentColor }]} onPress={() => openResolve(a)}>
            <Text style={[styles.resolveBtnText, { color: accentColor }]}>Resolve</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={() => router.push({ pathname: '/patient-detail', params: { patientId: a.patientId } })}>
        <Text style={styles.patientLink}>{a.patient?.firstName} {a.patient?.lastName} · MRN {a.patient?.mrn}</Text>
        <Text style={styles.surgeryText}>{a.patient?.surgeryType}</Text>
      </TouchableOpacity>

      <Text style={styles.alertMsg}>{a.message.replace(/[🚨⚠️📋ℹ️]/g, '').trim()}</Text>
      <Text style={styles.alertTime}>{new Date(a.createdAt).toLocaleString()}</Text>

      {a.isResolved && a.resolutionNote && (
        <View style={styles.resNoteBox}>
          <Ionicons name="clipboard-outline" size={12} color={Colors.semantic.success} />
          <Text style={styles.resNoteText}>{a.resolutionNote}</Text>
        </View>
      )}
      {a.isResolved && a.resolvedBy && (
        <Text style={styles.resolvedBy}>by {a.resolvedBy.firstName} {a.resolvedBy.lastName} · {new Date(a.resolvedAt).toLocaleDateString()}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDoctor ? '#7F4A00' : '#4A235A' }]}>
        <Text style={styles.title}>Alert Center</Text>
        <View style={styles.countRow}>
          {critCount > 0 && (
            <View style={styles.countBadge}>
              <Ionicons name="alert-circle" size={14} color={Colors.semantic.error} />
              <Text style={[styles.countText, { color: Colors.semantic.error }]}>{critCount} CRITICAL</Text>
            </View>
          )}
          {highCount > 0 && (
            <View style={styles.countBadge}>
              <Ionicons name="warning" size={14} color={Colors.semantic.warning} />
              <Text style={[styles.countText, { color: Colors.semantic.warning }]}>{highCount} HIGH</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && { borderBottomColor: accentColor, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: accentColor, fontWeight: FontWeight.bold }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity filter */}
      <FlatList
        horizontal
        data={SEV_FILTERS}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity style={[styles.filterChip, sevFilter === f && { backgroundColor: accentColor }]} onPress={() => setSevFilter(f)}>
            {f !== 'All' && sevFilter !== f && <View style={[styles.filterDot, { backgroundColor: SEV_COLOR[f] }]} />}
            <Text style={[styles.filterText, sevFilter === f && { color: '#FFF' }]}>{f}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={a => a.id}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={52} color={Colors.semantic.success} />
              <Text style={styles.emptyTitle}>No alerts found</Text>
              <Text style={styles.emptyText}>Your patients are looking good!</Text>
            </View>
          }
        />
      )}

      {/* Resolve Modal */}
      <Modal visible={!!resolveModal?.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Resolve Alert</Text>
            <Text style={styles.modalSub}>Patient: {resolveModal?.patientName}</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a resolution note (optional)..."
              placeholderTextColor={Colors.text.tertiary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResolveModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                onPress={confirmResolve}
                disabled={resolving}
              >
                {resolving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.confirmBtnText}>Resolve</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  title: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: 8 },
  countRow: { flexDirection: 'row', gap: 10 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.background.card, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  filterRow: { paddingHorizontal: Spacing.xl, paddingVertical: 8, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.background.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border.light },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text.secondary },
  list: { padding: Spacing.xl, gap: 10 },
  alertCard: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 14, borderLeftWidth: 4, ...Shadow.sm },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sevText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resolvedText: { fontSize: FontSize.xs, color: Colors.semantic.success, fontWeight: FontWeight.medium },
  resolveBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  resolveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  patientLink: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.primary.teal },
  surgeryText: { fontSize: FontSize.xs, color: Colors.text.secondary, marginBottom: 6 },
  alertMsg: { fontSize: FontSize.sm, color: Colors.text.primary, lineHeight: 18 },
  alertTime: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 6 },
  resNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.semantic.successLight, borderRadius: 6, padding: 8, marginTop: 8 },
  resNoteText: { fontSize: FontSize.xs, color: Colors.semantic.success, flex: 1 },
  resolvedBy: { fontSize: 10, color: Colors.text.tertiary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  emptyText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.xl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: 4 },
  modalSub: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 16 },
  noteInput: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, padding: 12, fontSize: FontSize.md, color: Colors.text.primary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.background.primary, alignItems: 'center' },
  cancelBtnText: { fontSize: FontSize.md, color: Colors.text.secondary, fontWeight: FontWeight.medium },
  confirmBtn: { flex: 1, padding: 14, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmBtnText: { fontSize: FontSize.md, color: '#FFF', fontWeight: FontWeight.semibold },
});
