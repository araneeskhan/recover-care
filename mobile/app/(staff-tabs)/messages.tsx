import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { staffAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';

export default function StaffMessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffAPI.getConversations();
      setConversations(res.data);
    } catch (e) {
      console.log('Load conversations error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  const renderConversation = ({ item: c }: { item: any }) => {
    const hasUnread = c.unreadCount > 0;
    const lastMsg = c.lastMessage;
    const lastTime = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    return (
      <TouchableOpacity
        style={[styles.convoCard, hasUnread && styles.convoCardUnread]}
        onPress={() => router.push({ pathname: '/staff-chat', params: { patientId: c.patient.id, patientName: `${c.patient.firstName} ${c.patient.lastName}`, surgeryType: c.patient.surgeryType } })}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: accentColor + '22' }]}>
          <Text style={[styles.avatarText, { color: accentColor }]}>{c.patient.firstName[0]}{c.patient.lastName[0]}</Text>
        </View>
        <View style={styles.convoBody}>
          <View style={styles.convoTop}>
            <Text style={[styles.patientName, hasUnread && styles.patientNameBold]}>
              {c.patient.firstName} {c.patient.lastName}
            </Text>
            <Text style={styles.timeText}>{lastTime}</Text>
          </View>
          <Text style={styles.surgeryText}>{c.patient.surgeryType}</Text>
          {lastMsg ? (
            <Text style={[styles.lastMsg, hasUnread && styles.lastMsgBold]} numberOfLines={1}>
              {lastMsg.senderType === 'PATIENT' ? '' : 'You: '}{lastMsg.content}
            </Text>
          ) : (
            <Text style={styles.noMsg}>No messages yet — tap to start</Text>
          )}
        </View>
        {hasUnread ? (
          <View style={[styles.unreadBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.unreadText}>{c.unreadCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.neutral.mediumGray} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: isDoctor ? '#7F4A00' : '#4A235A' }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalUnread} unread</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Patient conversations</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.patient.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color={Colors.neutral.mediumGray} />
              <Text style={styles.emptyTitle}>No conversations</Text>
              <Text style={styles.emptyText}>You have no assigned patients to message</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  totalBadge: { backgroundColor: Colors.semantic.error, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 2 },
  list: { padding: Spacing.xl, gap: 8 },
  convoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: 14, ...Shadow.sm },
  convoCardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.semantic.error },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  convoBody: { flex: 1 },
  convoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  patientName: { fontSize: FontSize.md, color: Colors.text.primary, fontWeight: FontWeight.medium },
  patientNameBold: { fontWeight: FontWeight.bold },
  timeText: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  surgeryText: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 1 },
  lastMsg: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  lastMsgBold: { color: Colors.text.primary, fontWeight: FontWeight.medium },
  noMsg: { fontSize: FontSize.sm, color: Colors.text.tertiary, fontStyle: 'italic', marginTop: 3 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  emptyText: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
