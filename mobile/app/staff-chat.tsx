import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { staffAPI } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

export default function StaffChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { patientId, patientName, surgeryType } = useLocalSearchParams<{
    patientId: string; patientName: string; surgeryType: string;
  }>();
  const isDoctor = user?.role === 'DOCTOR';
  const accentColor = isDoctor ? '#E67E22' : '#9B59B6';

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const res = await staffAPI.getMessages(patientId);
      setMessages(res.data.messages ?? []);
    } catch (e) {
      console.log('Load staff messages error:', e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await staffAPI.sendMessage(patientId, content);
      await load();
    } catch {
      Alert.alert('Error', 'Failed to send message');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const isSentByMe = (msg: any) => msg.senderType === user?.role;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const renderMsg = ({ item: msg, index }: { item: any; index: number }) => {
    const mine = isSentByMe(msg);
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
    return (
      <View>
        {showDate && (
          <Text style={styles.dateDivider}>
            {new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        )}
        <View style={[styles.msgRow, mine ? styles.msgRowRight : styles.msgRowLeft]}>
          {!mine && (
            <View style={[styles.avatar, { backgroundColor: '#3498DB22' }]}>
              <Text style={{ color: '#3498DB', fontSize: 12, fontWeight: '700' }}>
                {(patientName ?? 'P').split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
          )}
          <View style={[styles.bubble, mine ? [styles.bubbleMine, { backgroundColor: accentColor }] : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>{msg.content}</Text>
            <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>{fmtTime(msg.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDoctor ? '#7F4A00' : '#4A235A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(patientName ?? 'P').split(' ').map((n: string) => n[0]).join('')}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{patientName}</Text>
            <Text style={styles.headerSub}>{surgeryType}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push({ pathname: '/patient-detail', params: { patientId } })}>
          <Ionicons name="information-circle-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={accentColor} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.neutral.mediumGray} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Start the conversation with {patientName}</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={Colors.text.tertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? accentColor : Colors.border.medium }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 14, paddingHorizontal: Spacing.xl, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerName: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  msgList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, flexGrow: 1 },
  dateDivider: { textAlign: 'center', color: Colors.text.tertiary, fontSize: FontSize.xs, marginVertical: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 6 },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.background.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border.light },
  bubbleText: { fontSize: FontSize.md, lineHeight: 20 },
  bubbleTextMine: { color: '#FFF' },
  bubbleTextTheirs: { color: Colors.text.primary },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  bubbleTimeTheirs: { color: Colors.text.tertiary },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyChatText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  emptyChatSub: { fontSize: FontSize.sm, color: Colors.text.secondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.lg, gap: 10, backgroundColor: Colors.background.card, borderTopWidth: 1, borderTopColor: Colors.border.light },
  input: { flex: 1, maxHeight: 100, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: FontSize.md, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border.light },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
