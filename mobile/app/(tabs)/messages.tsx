import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { messageAPI } from '../../services/api';
import { Colors, Shadow } from '../../constants/Colors';

const DEMO_CONVERSATIONS = [
  {
    staff: { id: 'nurse1', firstName: 'Émilie', lastName: 'Laurent', staffRole: 'NURSE', specialty: 'Post-op Care' },
    lastMessage: { content: "Some pinkness is normal. Please send a photo through the secure upload and I'll review with Dr. Patel before noon.", createdAt: new Date().toISOString(), senderType: 'NURSE' },
    unreadCount: 2,
    online: true,
  },
  {
    staff: { id: 'doc1', firstName: 'Aarav', lastName: 'Patel', staffRole: 'SURGEON', specialty: 'General Surgery' },
    lastMessage: { content: 'Your recovery is looking great. See you Friday for the follow-up.', createdAt: new Date(Date.now()-86400000).toISOString(), senderType: 'DOCTOR' },
    unreadCount: 0,
    online: false,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');

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

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${c.staff.firstName} ${c.staff.lastName}`.toLowerCase();
    return name.includes(q) || c.staff.specialty?.toLowerCase().includes(q);
  });

  const renderConversation = ({ item }: { item: any }) => {
    const st = item.staff;
    const roleColor = st.staffRole === 'NURSE' ? Colors.primary.teal : Colors.primary.navy;
    const isUnread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={[s.convCard, isUnread && s.convCardUnread]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/chat', params: { staffId: st.id, staffName: `${st.firstName} ${st.lastName}`, staffRole: st.staffRole, specialty: st.specialty } })}>
        {isUnread && <View style={s.unreadBar}/>}
        <View style={s.avatarWrap}>
          <View style={[s.avatar, {backgroundColor: roleColor}]}>
            <Text style={s.avatarText}>{getInitials(st.firstName, st.lastName)}</Text>
          </View>
          {item.online && <View style={s.onlineDot}/>}
        </View>
        <View style={s.convInfo}>
          <View style={s.convHeader}>
            <Text style={[s.convName, isUnread && s.convNameUnread]}>
              {st.staffRole === 'NURSE' ? 'Nurse' : 'Dr.'} {st.firstName} {st.lastName}
            </Text>
            <Text style={[s.convTime, isUnread && {color: Colors.primary.teal, fontWeight: '700'}]}>
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
            </Text>
          </View>
          <View style={s.convBottom}>
            <Text style={[s.convMsg, isUnread && s.convMsgUnread]} numberOfLines={2}>
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={s.unreadBadge}><Text style={s.unreadText}>{item.unreadCount}</Text></View>
            )}
          </View>
          <View style={s.convMeta}>
            <Ionicons name="shield-checkmark" size={11} color={Colors.primary.teal}/>
            <Text style={s.metaText}>Encrypted</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaText}>{st.specialty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <View>
          <Text style={s.title}>Messages</Text>
          <Text style={s.subtitle}>Your care team</Text>
        </View>
        <TouchableOpacity style={s.composeBtn} onPress={() => {}}>
          <Ionicons name="create-outline" size={22} color={Colors.primary.teal}/>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.neutral.mediumGray}/>
        <TextInput
          style={s.searchInput}
          placeholder="Search care team…"
          placeholderTextColor={Colors.neutral.mediumGray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={()=>setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.neutral.mediumGray}/>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderConversation}
        keyExtractor={(item) => item.staff.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.neutral.mediumGray}/>
            </View>
            <Text style={s.emptyTitle}>{search ? 'No results found' : 'No conversations yet'}</Text>
            <Text style={s.emptyBody}>
              {search ? `No care team member matches "${search}"` : 'Your care team messages will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:Colors.background.primary },
  headerBar:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:60, paddingHorizontal:24, paddingBottom:12 },
  title:{ fontSize:28, fontWeight:'800', color:Colors.text.primary },
  subtitle:{ fontSize:13, color:Colors.text.secondary, marginTop:2, fontWeight:'500' },
  composeBtn:{ width:44, height:44, borderRadius:22, backgroundColor:'#FFF', justifyContent:'center', alignItems:'center', ...Shadow.sm },
  searchWrap:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF', marginHorizontal:16, marginBottom:16, borderRadius:14, paddingHorizontal:14, paddingVertical:12, gap:10, ...Shadow.sm },
  searchInput:{ flex:1, fontSize:15, color:Colors.text.primary },
  list:{ paddingHorizontal:16, paddingBottom:20 },
  convCard:{ flexDirection:'row', backgroundColor:'#FFF', borderRadius:18, padding:16, marginBottom:12, ...Shadow.sm, overflow:'hidden' },
  convCardUnread:{ backgroundColor:'rgba(26,158,143,0.03)', borderWidth:1, borderColor:'rgba(26,158,143,0.15)' },
  unreadBar:{ position:'absolute', left:0, top:0, bottom:0, width:4, backgroundColor:Colors.primary.teal, borderTopLeftRadius:18, borderBottomLeftRadius:18 },
  avatarWrap:{ position:'relative', marginRight:14 },
  avatar:{ width:52, height:52, borderRadius:26, justifyContent:'center', alignItems:'center' },
  avatarText:{ color:'#FFF', fontSize:18, fontWeight:'700' },
  onlineDot:{ position:'absolute', bottom:1, right:1, width:13, height:13, borderRadius:7, backgroundColor:Colors.semantic.success, borderWidth:2, borderColor:'#FFF' },
  convInfo:{ flex:1 },
  convHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  convName:{ fontSize:15, fontWeight:'600', color:Colors.text.primary },
  convNameUnread:{ fontWeight:'700' },
  convTime:{ fontSize:12, color:Colors.text.secondary, fontWeight:'500' },
  convBottom:{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 },
  convMsg:{ flex:1, fontSize:13, color:Colors.text.secondary, lineHeight:19, marginRight:8 },
  convMsgUnread:{ color:Colors.text.primary, fontWeight:'500' },
  unreadBadge:{ backgroundColor:Colors.primary.teal, borderRadius:10, minWidth:20, height:20, justifyContent:'center', alignItems:'center', paddingHorizontal:6 },
  unreadText:{ color:'#FFF', fontSize:11, fontWeight:'800' },
  convMeta:{ flexDirection:'row', alignItems:'center', gap:5 },
  metaText:{ fontSize:11, color:Colors.text.tertiary },
  metaDot:{ color:Colors.text.tertiary, fontSize:11 },
  emptyWrap:{ alignItems:'center', paddingTop:60, paddingHorizontal:32 },
  emptyIcon:{ width:80, height:80, borderRadius:40, backgroundColor:Colors.border.light, justifyContent:'center', alignItems:'center', marginBottom:16 },
  emptyTitle:{ fontSize:17, fontWeight:'700', color:Colors.text.primary, marginBottom:8 },
  emptyBody:{ fontSize:14, color:Colors.text.secondary, textAlign:'center', lineHeight:21 },
});
