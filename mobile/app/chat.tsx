import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { messageAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

const DEMO_MESSAGES = [
  { id:'1', content:'Good morning, Sarah! How are you feeling today?', senderId:'nurse1', senderType:'NURSE', createdAt:new Date(new Date().setHours(8,2,0,0)).toISOString(), isRead:true },
  { id:'2', content:'Morning Émilie. Pain is around a 3 — much better than yesterday.', senderId:'patient1', senderType:'PATIENT', createdAt:new Date(new Date().setHours(8,14,0,0)).toISOString(), isRead:true },
  { id:'3', content:"That's wonderful progress 💚 Are you keeping up with the walking exercises?", senderId:'nurse1', senderType:'NURSE', createdAt:new Date(new Date().setHours(8,15,0,0)).toISOString(), isRead:true },
  { id:'4', content:'Yes, two short walks already. Incision looks a bit pink near the top — should I be worried?', senderId:'patient1', senderType:'PATIENT', createdAt:new Date(new Date().setHours(8,22,0,0)).toISOString(), isRead:true },
  { id:'5', content:"Some pinkness is normal. Please send a photo through the secure upload and I'll review with Dr. Patel before noon.", senderId:'nurse1', senderType:'NURSE', createdAt:new Date(new Date().setHours(8,24,0,0)).toISOString(), isRead:true },
];

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ staffId: string; staffName: string; staffRole: string; specialty: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await messageAPI.getMessages(params.staffId!);
        setMessages(r.data.messages);
      } catch { setMessages(DEMO_MESSAGES); }
    })();
  }, [params.staffId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), content: input, senderId: 'patient1', senderType: 'PATIENT', createdAt: new Date().toISOString(), isRead: false };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    try { await messageAPI.sendMessage(params.staffId!, input); } catch {}
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const initials = params.staffName?.split(' ').map((n: string)=>n[0]).join('').toUpperCase() || 'ÉL';

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderType === 'PATIENT';
    return (
      <View style={[s.bubbleRow, isMine && s.bubbleRowRight]}>
        <View style={[s.bubble, isMine ? s.bubbleSent : s.bubbleReceived]}>
          <Text style={[s.bubbleText, isMine ? s.bubbleTextSent : s.bubbleTextReceived]}>{item.content}</Text>
        </View>
        <View style={[s.meta, isMine && { alignItems: 'flex-end' }]}>
          <Text style={s.time}>{fmtTime(item.createdAt)}</Text>
          {isMine && item.isRead && <Text style={s.readLabel}> · Read</Text>}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={[s.avatar, { backgroundColor: params.staffRole === 'NURSE' ? Colors.primary.teal : Colors.primary.navy }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{params.staffRole === 'NURSE' ? 'Nurse' : 'Dr.'} {params.staffName}</Text>
          <View style={s.headerMeta}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.primary.teal} />
            <Text style={s.encrypted}>Encrypted</Text>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Online · responds in ~5 min</Text>
          </View>
        </View>
        <TouchableOpacity style={s.callBtn}>
          <Ionicons name="call" size={22} color={Colors.primary.teal} />
        </TouchableOpacity>
      </View>

      {/* Date separator */}
      <View style={s.dateSep}><Text style={s.dateSepText}>TODAY</Text></View>

      {/* Messages */}
      <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={item => item.id}
        contentContainerStyle={s.messageList} showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()} />

      {/* Input bar */}
      <View style={s.inputBar}>
        <TouchableOpacity style={s.attachBtn}><Ionicons name="add" size={24} color={Colors.text.secondary} /></TouchableOpacity>
        <View style={s.inputWrap}>
          <TextInput style={s.input} placeholder={`Message ${params.staffName?.split(' ')[0] || 'Émilie'}...`}
            placeholderTextColor={Colors.neutral.mediumGray} value={input} onChangeText={setInput}
            multiline maxLength={1000} />
          <TouchableOpacity><Ionicons name="camera-outline" size={22} color={Colors.neutral.mediumGray} /></TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.sendBtn, input.trim() ? s.sendBtnActive : {}]} onPress={sendMessage} disabled={!input.trim()}>
          <Ionicons name="send" size={20} color={input.trim() ? '#FFF' : Colors.neutral.mediumGray} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  encrypted: { fontSize: 11, color: Colors.primary.teal, fontWeight: '600' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.semantic.success, marginLeft: 4 },
  onlineText: { fontSize: 11, color: Colors.text.tertiary },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(26,158,143,0.1)', justifyContent: 'center', alignItems: 'center' },
  dateSep: { alignItems: 'center', paddingVertical: 12 },
  dateSepText: { fontSize: 12, fontWeight: '600', color: Colors.text.tertiary, backgroundColor: Colors.background.primary, paddingHorizontal: 16 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8 },
  bubbleRow: { marginBottom: 4, maxWidth: '80%' },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  bubbleSent: { backgroundColor: Colors.message.sent, borderBottomRightRadius: 4 },
  bubbleReceived: { backgroundColor: Colors.message.received, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextSent: { color: Colors.message.sentText },
  bubbleTextReceived: { color: Colors.message.receivedText },
  meta: { flexDirection: 'row', marginTop: 4, marginBottom: 8 },
  time: { fontSize: 11, color: Colors.text.tertiary },
  readLabel: { fontSize: 11, color: Colors.primary.teal },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 34, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: Colors.border.light, gap: 8 },
  attachBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.text.primary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border.light, justifyContent: 'center', alignItems: 'center' },
  sendBtnActive: { backgroundColor: Colors.primary.teal },
});
