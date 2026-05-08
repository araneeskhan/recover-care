import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { messageAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';

const DEMO_CONVERSATIONS = [
  {
    staff: { id: 'nurse1', firstName: 'Émilie', lastName: 'Laurent', staffRole: 'NURSE', specialty: 'Post-op Care' },
    lastMessage: { content: "Some pinkness is normal. Please send a photo through the secure upload and I'll review with Dr. Patel before noon.", createdAt: new Date().toISOString(), senderType: 'NURSE' },
    unreadCount: 2,
  },
  {
    staff: { id: 'doc1', firstName: 'Aarav', lastName: 'Patel', staffRole: 'SURGEON', specialty: 'General Surgery' },
    lastMessage: { content: 'Your recovery is looking great. See you Friday for the follow-up.', createdAt: new Date(Date.now()-86400000).toISOString(), senderType: 'DOCTOR' },
    unreadCount: 0,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);

  const fetchConversations = useCallback(async () => {
    try { const r = await messageAPI.getConversations(); setConversations(r.data); }
    catch { setConversations(DEMO_CONVERSATIONS); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const getInitials = (f: string, l: string) => `${f[0]}${l[0]}`.toUpperCase();

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr), now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffH < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: any }) => {
    const st = item.staff;
    const roleColor = st.staffRole === 'NURSE' ? Colors.primary.teal : Colors.primary.navy;
    return (
      <TouchableOpacity style={s.convCard} activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/chat', params: { staffId: st.id, staffName: `${st.firstName} ${st.lastName}`, staffRole: st.staffRole, specialty: st.specialty } })}>
        <View style={[s.avatar, { backgroundColor: roleColor }]}>
          <Text style={s.avatarText}>{getInitials(st.firstName, st.lastName)}</Text>
        </View>
        <View style={s.convInfo}>
          <View style={s.convHeader}>
            <Text style={s.convName}>{st.staffRole === 'NURSE' ? 'Nurse' : 'Dr.'} {st.firstName} {st.lastName}</Text>
            <Text style={s.convTime}>{item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}</Text>
          </View>
          <View style={s.convBottom}>
            <Text style={[s.convMsg, item.unreadCount > 0 && s.convMsgUnread]} numberOfLines={2}>
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={s.unreadBadge}><Text style={s.unreadText}>{item.unreadCount}</Text></View>
            )}
          </View>
          <View style={s.convMeta}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.primary.teal} />
            <Text style={s.metaText}>Encrypted</Text>
            <Text style={s.metaDot}>•</Text>
            <Text style={s.metaText}>{st.specialty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <Text style={s.title}>Messages</Text>
        <TouchableOpacity style={s.composeBtn}>
          <Ionicons name="create-outline" size={24} color={Colors.primary.teal} />
        </TouchableOpacity>
      </View>
      <FlatList data={conversations} renderItem={renderConversation} keyExtractor={(item) => item.staff.id}
        contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty}>No conversations yet</Text>} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  composeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  list: { paddingHorizontal: 16 },
  convCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, ...Shadow.sm },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  convInfo: { flex: 1, marginLeft: 14 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontSize: 16, fontWeight: '600', color: Colors.text.primary },
  convTime: { fontSize: 12, color: Colors.text.secondary },
  convBottom: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  convMsg: { flex: 1, fontSize: 14, color: Colors.text.secondary, lineHeight: 20, marginRight: 8 },
  convMsgUnread: { color: Colors.text.primary, fontWeight: '500' },
  unreadBadge: { backgroundColor: Colors.primary.teal, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.text.tertiary },
  metaDot: { color: Colors.text.tertiary, fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 60, color: Colors.text.secondary, fontSize: 16 },
});
