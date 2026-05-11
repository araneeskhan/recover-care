import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { patientAPI } from '../../services/api';
import { Colors, Shadow } from '../../constants/Colors';
import { useTheme } from '../../constants/Colors';

const DEMO_PROFILE = {
  firstName:'Sarah', lastName:'Chen', mrn:'4729-883', age:42,
  phone: '+1 (555) 234-5678',
  surgeryType:'Laparoscopic Cholecystectomy', surgeryDate:'2026-05-02', hospital:'Mercy General',
  recoveryDays:14, currentDay:5,
  bloodType: 'A+',
  allergies: 'Penicillin',
  emergencyContactName: 'David Chen',
  emergencyContactPhone: '+1 (555) 987-6543',
  address: '450 Riverside Drive, Apt 12B, New York',
  careTeam: [
    { staff: { id:'d1', firstName:'Aarav', lastName:'Patel', staffRole:'SURGEON', specialty:'General Surgery' } },
    { staff: { id:'n1', firstName:'Émilie', lastName:'Laurent', staffRole:'NURSE', specialty:'Post-op Care' } },
  ],
};

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionAccent} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [medReminders, setMedReminders] = useState(true);
  const [checkInNudges, setCheckInNudges] = useState(true);
  const [careMessages, setCareMessages] = useState(true);
  const { isDark, toggleTheme } = useTheme();

  const fetchProfile = async () => {
    try { const r = await patientAPI.getProfile(); setProfile(r.data); }
    catch { setProfile(DEMO_PROFILE); }
  };

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    const unsubscribe = router.subscribe?.(() => fetchProfile());
    return () => unsubscribe?.();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const p = profile;
  if (!p) return (
    <View style={[s.container, {justifyContent:'center', alignItems:'center'}]}>
      <Ionicons name="person-circle-outline" size={48} color={Colors.neutral.mediumGray}/>
      <Text style={{color:Colors.text.secondary, marginTop:12, fontSize:15}}>Loading profile…</Text>
    </View>
  );

  const initials = `${p.firstName[0]}${p.lastName[0]}`;
  const surgeryDate = new Date(p.surgeryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const recoveryPct = Math.round(((p.currentDay || 5) / (p.recoveryDays || 14)) * 100);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Profile</Text>
        <TouchableOpacity style={s.editBtn} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="create-outline" size={20} color={Colors.primary.teal}/>
        </TouchableOpacity>
      </View>

      {/* Patient Card */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={s.patientCard}>
        <View style={s.patientTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.patientInfo}>
            <Text style={s.patientName}>{p.firstName} {p.lastName}</Text>
            <Text style={s.patientMeta}>MRN · {p.mrn} · Age {p.age}</Text>
            <View style={s.statusBadge}>
              <View style={s.statusDot}/>
              <Text style={s.statusText}>Active recovery · Day {p.currentDay || 5}</Text>
            </View>
          </View>
        </View>

        {/* Recovery progress */}
        <View style={s.recoveryBlock}>
          <View style={s.recoveryLabelRow}>
            <Text style={s.recoveryLabel}>Recovery Progress</Text>
            <Text style={s.recoveryPct}>{recoveryPct}%</Text>
          </View>
          <View style={s.recoveryTrack}>
            <View style={[s.recoveryFill, {width: `${recoveryPct}%` as any}]}/>
          </View>
          <Text style={s.recoverySub}>Day {p.currentDay || 5} of {p.recoveryDays || 14}</Text>
        </View>

        <View style={s.surgeryInfo}>
          <Text style={s.surgeryLabel}>SURGERY</Text>
          <Text style={s.surgeryType}>{p.surgeryType}</Text>
          <View style={s.surgeryMeta}>
            <View>
              <Text style={s.metaLabel}>DATE</Text>
              <Text style={s.metaValue}>{surgeryDate}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>HOSPITAL</Text>
              <Text style={s.metaValue}>{p.hospital}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Care Team */}
      <SectionHeader title="Care Team" />
      <View style={s.teamRow}>
        {(p.careTeam || DEMO_PROFILE.careTeam).map((ct: any) => {
          const st = ct.staff;
          const ini = `${st.firstName[0]}${st.lastName[0]}`;
          const isSurgeon = st.staffRole === 'SURGEON';
          const roleColor = isSurgeon ? Colors.primary.navy : Colors.primary.teal;
          return (
            <View key={st.id} style={s.teamCard}>
              <View style={[s.teamCardTop, {backgroundColor: roleColor + '15'}]}>
                <View style={[s.teamAvatar, {backgroundColor: roleColor}]}>
                  <Text style={s.teamAvatarText}>{ini}</Text>
                </View>
              </View>
              <View style={s.teamCardBody}>
                <Text style={[s.teamRole, {color: roleColor}]}>{isSurgeon ? 'SURGEON' : 'NURSE'}</Text>
                <Text style={s.teamName}>{isSurgeon ? 'Dr.' : ''} {st.firstName} {st.lastName}</Text>
                <Text style={s.teamSpec}>{st.specialty}</Text>
                <View style={s.teamActions}>
                  <TouchableOpacity style={[s.teamActionBtn, {backgroundColor: roleColor + '15'}]}>
                    <Ionicons name="call" size={16} color={roleColor}/>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.teamActionBtn, {backgroundColor: roleColor + '15'}]}
                    onPress={() => router.push({ pathname: '/chat', params: { staffId: st.id, staffName: `${st.firstName} ${st.lastName}`, staffRole: st.staffRole, specialty: st.specialty } })}>
                    <Ionicons name="chatbubble" size={16} color={roleColor}/>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Personal Details */}
      <SectionHeader title="Personal Details" />
      <View style={s.detailCard}>
        <View style={s.detailRow}>
          <View style={s.detailIcon}><Ionicons name="call" size={16} color={Colors.primary.teal}/></View>
          <View style={s.detailInfo}>
            <Text style={s.detailLabel}>Phone</Text>
            <Text style={s.detailValue}>{p.phone || 'Not set'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.border.medium}/>
        </View>
        <View style={s.detailDivider}/>
        <View style={s.detailRow}>
          <View style={s.detailIcon}><Ionicons name="location" size={16} color={Colors.primary.teal}/></View>
          <View style={s.detailInfo}>
            <Text style={s.detailLabel}>Address</Text>
            <Text style={s.detailValue}>{p.address || 'Not set'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.border.medium}/>
        </View>
      </View>

      {/* Medical Info */}
      <SectionHeader title="Medical Info" />
      <View style={s.detailCard}>
        <View style={s.detailRow}>
          <View style={[s.detailIcon, {backgroundColor:Colors.semantic.errorLight}]}>
            <Ionicons name="water" size={16} color={Colors.semantic.error}/>
          </View>
          <View style={s.detailInfo}>
            <Text style={s.detailLabel}>Blood Type</Text>
            <Text style={s.detailValue}>{p.bloodType || 'Not set'}</Text>
          </View>
        </View>
        <View style={s.detailDivider}/>
        <View style={s.detailRow}>
          <View style={[s.detailIcon, {backgroundColor:Colors.semantic.warningLight}]}>
            <Ionicons name="warning" size={16} color={Colors.semantic.warning}/>
          </View>
          <View style={s.detailInfo}>
            <Text style={s.detailLabel}>Allergies</Text>
            <Text style={s.detailValue}>{p.allergies || 'None reported'}</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contact */}
      <SectionHeader title="Emergency Contact" />
      <View style={s.detailCard}>
        <View style={s.detailRow}>
          <View style={[s.detailIcon, {backgroundColor:Colors.semantic.errorLight}]}>
            <Ionicons name="alert-circle" size={16} color={Colors.semantic.error}/>
          </View>
          <View style={s.detailInfo}>
            <Text style={s.detailLabel}>{p.emergencyContactName || 'Not set'}</Text>
            <Text style={s.detailValue}>{p.emergencyContactPhone || 'Add an emergency contact'}</Text>
          </View>
          <TouchableOpacity style={s.callBtn}>
            <Ionicons name="call" size={14} color={Colors.primary.teal}/>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={s.notifCard}>
        {[
          { label: 'Medication reminders', icon: 'medical-outline', value: medReminders, onChange: setMedReminders },
          { label: 'Check-in nudges', icon: 'clipboard-outline', value: checkInNudges, onChange: setCheckInNudges },
          { label: 'Care team messages', icon: 'chatbubble-outline', value: careMessages, onChange: setCareMessages },
        ].map((item, i) => (
          <View key={item.label}>
            {i > 0 && <View style={s.notifDivider}/>}
            <View style={s.notifRow}>
              <View style={s.notifLeft}>
                <Ionicons name={item.icon as any} size={17} color={Colors.primary.teal}/>
                <Text style={s.notifLabel}>{item.label}</Text>
              </View>
              <Switch value={item.value} onValueChange={item.onChange}
                trackColor={{false:Colors.border.light, true:Colors.primary.teal}} thumbColor="#FFF"/>
            </View>
          </View>
        ))}
        <View style={s.notifDivider}/>
        <View style={s.notifRow}>
          <View style={s.notifLeft}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color={isDark ? '#F2994A' : Colors.primary.teal}/>
            <Text style={s.notifLabel}>Dark Mode</Text>
          </View>
          <Switch value={isDark} onValueChange={toggleTheme}
            trackColor={{false:Colors.border.light, true:Colors.primary.teal}} thumbColor="#FFF"/>
        </View>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={s.detailCard}>
        <TouchableOpacity style={s.detailRow} onPress={() => router.push('/edit-profile')}>
          <View style={s.detailIcon}><Ionicons name="person" size={16} color={Colors.primary.teal}/></View>
          <View style={[s.detailInfo, {flex:1}]}>
            <Text style={s.detailLabel}>Edit Profile</Text>
            <Text style={s.detailValue}>Update your personal information</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.border.medium}/>
        </TouchableOpacity>
        <View style={s.detailDivider}/>
        <TouchableOpacity style={s.detailRow} onPress={() => router.push('/edit-profile')}>
          <View style={s.detailIcon}><Ionicons name="key" size={16} color={Colors.primary.teal}/></View>
          <View style={[s.detailInfo, {flex:1}]}>
            <Text style={s.detailLabel}>Change Password</Text>
            <Text style={s.detailValue}>Update your account password</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.border.medium}/>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.semantic.error}/>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{height:48}}/>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:Colors.background.primary },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:60, paddingHorizontal:24, paddingBottom:8 },
  title:{ fontSize:28, fontWeight:'800', color:Colors.text.primary },
  editBtn:{ width:40, height:40, borderRadius:20, backgroundColor:'#FFF', justifyContent:'center', alignItems:'center', ...Shadow.sm },
  patientCard:{ marginHorizontal:16, borderRadius:22, padding:20, marginTop:12 },
  patientTop:{ flexDirection:'row', alignItems:'center', marginBottom:16 },
  avatar:{ width:58, height:58, borderRadius:29, backgroundColor:Colors.primary.teal, justifyContent:'center', alignItems:'center', borderWidth:3, borderColor:'rgba(255,255,255,0.25)' },
  avatarText:{ color:'#FFF', fontSize:20, fontWeight:'800' },
  patientInfo:{ marginLeft:14, flex:1 },
  patientName:{ fontSize:20, fontWeight:'800', color:'#FFF' },
  patientMeta:{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:2 },
  statusBadge:{ flexDirection:'row', alignItems:'center', marginTop:6 },
  statusDot:{ width:7, height:7, borderRadius:4, backgroundColor:Colors.semantic.success, marginRight:6 },
  statusText:{ fontSize:12, color:Colors.semantic.success, fontWeight:'600' },
  recoveryBlock:{ backgroundColor:'rgba(255,255,255,0.1)', borderRadius:14, padding:14, marginBottom:14 },
  recoveryLabelRow:{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  recoveryLabel:{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:'600' },
  recoveryPct:{ fontSize:12, color:Colors.primary.tealLight, fontWeight:'800' },
  recoveryTrack:{ height:6, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:3, marginBottom:6 },
  recoveryFill:{ height:6, backgroundColor:Colors.primary.teal, borderRadius:3 },
  recoverySub:{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:'500' },
  surgeryInfo:{ backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:14 },
  surgeryLabel:{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:'700', letterSpacing:1.2, marginBottom:4 },
  surgeryType:{ fontSize:16, fontWeight:'700', color:'#FFF', marginBottom:12 },
  surgeryMeta:{ flexDirection:'row', gap:32 },
  metaLabel:{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:'700', letterSpacing:0.8 },
  metaValue:{ fontSize:13, color:'#FFF', fontWeight:'600', marginTop:2 },
  sectionHeader:{ flexDirection:'row', alignItems:'center', gap:8, marginTop:26, marginBottom:12, marginLeft:24 },
  sectionAccent:{ width:3, height:16, borderRadius:2, backgroundColor:Colors.primary.teal },
  sectionTitle:{ fontSize:15, fontWeight:'700', color:Colors.text.primary },
  teamRow:{ flexDirection:'row', paddingHorizontal:16, gap:12 },
  teamCard:{ flex:1, backgroundColor:'#FFF', borderRadius:18, overflow:'hidden', ...Shadow.sm },
  teamCardTop:{ alignItems:'center', paddingVertical:18 },
  teamAvatar:{ width:52, height:52, borderRadius:26, justifyContent:'center', alignItems:'center' },
  teamAvatarText:{ color:'#FFF', fontSize:18, fontWeight:'700' },
  teamCardBody:{ padding:14, alignItems:'center' },
  teamRole:{ fontSize:10, fontWeight:'700', letterSpacing:0.8, marginBottom:4 },
  teamName:{ fontSize:13, fontWeight:'700', color:Colors.text.primary, textAlign:'center' },
  teamSpec:{ fontSize:11, color:Colors.text.secondary, marginTop:2, textAlign:'center' },
  teamActions:{ flexDirection:'row', gap:10, marginTop:12 },
  teamActionBtn:{ width:34, height:34, borderRadius:17, justifyContent:'center', alignItems:'center' },
  detailCard:{ backgroundColor:'#FFF', marginHorizontal:16, borderRadius:16, padding:16, ...Shadow.sm },
  detailRow:{ flexDirection:'row', alignItems:'center', paddingVertical:6, gap:0 },
  detailIcon:{ width:36, height:36, borderRadius:18, backgroundColor:'rgba(26,158,143,0.1)', justifyContent:'center', alignItems:'center', marginRight:14 },
  detailInfo:{ flex:1 },
  detailLabel:{ fontSize:14, fontWeight:'600', color:Colors.text.primary },
  detailValue:{ fontSize:13, color:Colors.text.secondary, marginTop:1 },
  detailDivider:{ height:1, backgroundColor:Colors.border.light, marginLeft:50, marginVertical:8 },
  callBtn:{ width:32, height:32, borderRadius:16, backgroundColor:'rgba(26,158,143,0.1)', justifyContent:'center', alignItems:'center' },
  notifCard:{ backgroundColor:'#FFF', marginHorizontal:16, borderRadius:16, ...Shadow.sm },
  notifRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, paddingVertical:14 },
  notifLeft:{ flexDirection:'row', alignItems:'center', gap:12 },
  notifLabel:{ fontSize:15, color:Colors.text.primary, fontWeight:'500' },
  notifDivider:{ height:1, backgroundColor:Colors.border.light, marginHorizontal:18 },
  signOutBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginTop:24, marginHorizontal:16, paddingVertical:16, backgroundColor:'#FFF', borderRadius:16, ...Shadow.sm, borderWidth:1, borderColor:Colors.semantic.errorLight },
  signOutText:{ fontSize:16, fontWeight:'700', color:Colors.semantic.error },
});
