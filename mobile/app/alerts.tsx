import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadow } from '../constants/Colors';
import api from '../services/api';

const DEMO_ALERTS = [
  {
    id: '1',
    severity: 'CRITICAL',
    message: '🚨 CRITICAL: Patient reports pain level 9/10 with fever 39.1°C. Possible post-surgical infection. Immediate medical review required.',
    isResolved: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '2',
    severity: 'HIGH',
    message: '⚠️ HIGH: Patient has elevated temperature 38.7°C. Monitor for signs of infection.',
    isResolved: false,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: '3',
    severity: 'MEDIUM',
    message: '📋 MEDIUM: Pain increased from 3 to 7 since last check-in. Unexpected pain escalation.',
    isResolved: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '4',
    severity: 'LOW',
    message: 'ℹ️ LOW: Patient reports dizziness and nausea. May be medication side effect. Review at next check-in.',
    isResolved: true,
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: '5',
    severity: 'MEDIUM',
    message: '📋 MEDIUM: Patient reports 3 symptoms: Fatigue, Swelling, Headache. Increased monitoring recommended.',
    isResolved: true,
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  CRITICAL: { color: '#C0392B', bg: '#FADBD8', icon: 'alert-circle', label: 'Critical' },
  HIGH: { color: '#E67E22', bg: '#FDEBD0', icon: 'warning', label: 'High' },
  MEDIUM: { color: '#F2994A', bg: '#FEF5E7', icon: 'information-circle', label: 'Medium' },
  LOW: { color: '#3498DB', bg: '#D6EAF8', icon: 'information', label: 'Low' },
};

function formatAlertTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await api.get('/patients/me/alerts');
      setAlerts(r.data?.length ? r.data : DEMO_ALERTS);
    } catch {
      setAlerts(DEMO_ALERTS);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  const onRefresh = async () => { setRefreshing(true); await fetchAlerts(); setRefreshing(false); };

  const filtered = alerts.filter(a => {
    if (filter === 'active') return !a.isResolved;
    if (filter === 'resolved') return a.isResolved;
    return true;
  });

  const activeCount = alerts.filter(a => !a.isResolved).length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.isResolved).length;

  return (
    <View style={ns.container}>
      {/* Header */}
      <View style={ns.header}>
        <TouchableOpacity onPress={() => router.back()} style={ns.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ns.title}>Alerts</Text>
          <Text style={ns.subtitle}>
            {activeCount > 0 ? `${activeCount} active alert${activeCount > 1 ? 's' : ''}` : 'All clear — no active alerts'}
          </Text>
        </View>
        {criticalCount > 0 && (
          <View style={ns.criticalBadge}>
            <Ionicons name="alert-circle" size={14} color="#FFF" />
            <Text style={ns.criticalBadgeText}>{criticalCount}</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={ns.filterRow}>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <TouchableOpacity key={f} style={[ns.filterTab, filter === f && ns.filterTabActive]} onPress={() => setFilter(f)}>
            <Text style={[ns.filterText, filter === f && ns.filterTextActive]}>
              {f === 'all' ? `All (${alerts.length})` : f === 'active' ? `Active (${activeCount})` : `Resolved (${alerts.length - activeCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {/* Status banner */}
        {filter !== 'resolved' && criticalCount > 0 && (
          <View style={ns.banner}>
            <View style={ns.bannerIcon}>
              <Ionicons name="alert-circle" size={20} color={Colors.semantic.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ns.bannerTitle}>{criticalCount} critical alert{criticalCount > 1 ? 's' : ''} require attention</Text>
              <Text style={ns.bannerDesc}>Your care team has been notified automatically.</Text>
            </View>
          </View>
        )}

        {filter !== 'resolved' && activeCount === 0 && (
          <View style={ns.allClear}>
            <View style={ns.allClearIcon}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.semantic.success} />
            </View>
            <Text style={ns.allClearTitle}>All Clear! 🎉</Text>
            <Text style={ns.allClearDesc}>No active alerts. Your recovery is on track.</Text>
          </View>
        )}

        {/* Alert cards */}
        {filtered.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
          return (
            <View key={alert.id} style={[ns.alertCard, alert.isResolved && ns.alertCardResolved]}>
              <View style={ns.alertLeft}>
                <View style={[ns.alertSeverity, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon as any} size={18} color={config.color} />
                </View>
                <View style={[ns.alertLine, { backgroundColor: config.color + '30' }]} />
              </View>
              <View style={ns.alertContent}>
                <View style={ns.alertHeader}>
                  <View style={[ns.severityBadge, { backgroundColor: config.bg }]}>
                    <Text style={[ns.severityText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <Text style={ns.alertTime}>{formatAlertTime(alert.createdAt)}</Text>
                </View>
                <Text style={[ns.alertMessage, alert.isResolved && ns.alertMessageResolved]}>
                  {alert.message.replace(/^[🚨⚠️📋ℹ️]\s*(CRITICAL|HIGH|MEDIUM|LOW):\s*/, '')}
                </Text>
                {alert.isResolved && (
                  <View style={ns.resolvedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.semantic.success} />
                    <Text style={ns.resolvedText}>Resolved</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={ns.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.border.medium} />
            <Text style={ns.emptyText}>No {filter} alerts</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ns = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  criticalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.semantic.error, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  criticalBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 12, ...Shadow.sm },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  filterTabActive: { backgroundColor: 'rgba(26,158,143,0.1)' },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  filterTextActive: { color: Colors.primary.teal, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.semantic.errorLight, marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.semantic.error },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.semantic.error },
  bannerDesc: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  allClear: { alignItems: 'center', paddingVertical: 32, marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 20, ...Shadow.sm, marginBottom: 16 },
  allClearIcon: { marginBottom: 12 },
  allClearTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  allClearDesc: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
  alertCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4 },
  alertCardResolved: { opacity: 0.7 },
  alertLeft: { width: 28, alignItems: 'center', paddingTop: 16 },
  alertSeverity: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  alertLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  alertContent: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginLeft: 8, marginBottom: 8, ...Shadow.sm },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  severityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  alertTime: { fontSize: 12, color: Colors.text.tertiary },
  alertMessage: { fontSize: 14, lineHeight: 20, color: Colors.text.primary },
  alertMessageResolved: { color: Colors.text.secondary },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  resolvedText: { fontSize: 12, fontWeight: '500', color: Colors.semantic.success },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.text.secondary, marginTop: 12 },
});
