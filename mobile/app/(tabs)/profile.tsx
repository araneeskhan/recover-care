import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { patientAPI } from '../../services/api';
import { Colors, Shadow } from '../../constants/Colors';

const DEMO_PROFILE = {
  firstName:'Sarah', lastName:'Chen', mrn:'4729-883', age:42,
  surgeryType:'Laparoscopic Cholecystectomy', surgeryDate:'2026-05-02', hospital:'Mercy General',
  recoveryDays:14, currentDay:5,
  careTeam: [
    { staff: { id:'d1', firstName:'Aarav', lastName:'Patel', staffRole:'SURGEON', specialty:'General Surgery' } },
    { staff: { id:'n1', firstName:'Émilie', lastName:'Laurent', staffRole:'NURSE', specialty:'Post-op Care' } },
  ],
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [medReminders, setMedReminders] = useState(true);
  const [checkInNudges, setCheckInNudges] = useState(true);
  const [careMessages, setCareMessages] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await patientAPI.getProfile(); setProfile(r.data); }
      catch { setProfile(DEMO_PROFILE); }
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const p = profile;
  if (!p) return <View style={s.container}><Text style={{color:Colors.text.secondary,textAlign:'center',marginTop:100}}>Loading...</Text></View>;

  const initials = `${p.firstName[0]}${p.lastName[0]}`;
  const surgeryDate = new Date(p.surgeryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
        <TouchableOpacity style={s.editBtn}><Ionicons name="create-outline" size={22} color={Colors.text.primary} /></TouchableOpacity>
      </View>

      {/* Patient info card */}
      <View style={s.patientCard}>
        <View style={s.patientTop}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={s.patientInfo}>
            <Text style={s.patientName}>{p.firstName} {p.lastName}</Text>
            <Text style={s.patientMeta}>MRN · {p.mrn} · Age {p.age}</Text>
            <View style={s.statusBadge}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Active recovery · Day {p.currentDay || 5}</Text>
            </View>
          </View>
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
      </View>

      {/* Care Team */}
      <Text style={s.sectionTitle}>CARE TEAM</Text>
      <View style={s.teamRow}>
        {(p.careTeam || DEMO_PROFILE.careTeam).map((ct: any) => {
          const st = ct.staff;
          const ini = `${st.firstName[0]}${st.lastName[0]}`;
          const isSurgeon = st.staffRole === 'SURGEON';
          return (
            <View key={st.id} style={s.teamCard}>
              <View style={[s.teamAvatar, { backgroundColor: isSurgeon ? Colors.primary.navy : Colors.primary.teal }]}>
                <Text style={s.teamAvatarText}>{ini}</Text>
              </View>
              <Text style={s.teamRole}>{isSurgeon ? 'SURGEON' : 'NURSE'}</Text>
              <Text style={s.teamName}>{isSurgeon ? 'Dr.' : ''} {st.firstName} {st.lastName}</Text>
              <Text style={s.teamSpec}>{st.specialty}</Text>
              <View style={s.teamActions}>
                <TouchableOpacity style={s.teamActionBtn}>
                  <Ionicons name="call" size={18} color={Colors.primary.teal} />
                </TouchableOpacity>
                <TouchableOpacity style={s.teamActionBtn}
                  onPress={() => router.push({ pathname: '/chat', params: { staffId: st.id, staffName: `${st.firstName} ${st.lastName}`, staffRole: st.staffRole, specialty: st.specialty } })}>
                  <Ionicons name="chatbubble" size={18} color={Colors.primary.teal} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Notifications */}
      <Text style={s.sectionTitle}>NOTIFICATIONS</Text>
      <View style={s.notifCard}>
        <View style={s.notifRow}>
          <Text style={s.notifLabel}>Medication reminders</Text>
          <Switch value={medReminders} onValueChange={setMedReminders} trackColor={{ false: Colors.border.light, true: Colors.primary.teal }} thumbColor="#FFF" />
        </View>
        <View style={s.notifDivider} />
        <View style={s.notifRow}>
          <Text style={s.notifLabel}>Check-in nudges</Text>
          <Switch value={checkInNudges} onValueChange={setCheckInNudges} trackColor={{ false: Colors.border.light, true: Colors.primary.teal }} thumbColor="#FFF" />
        </View>
        <View style={s.notifDivider} />
        <View style={s.notifRow}>
          <Text style={s.notifLabel}>Care team messages</Text>
          <Switch value={careMessages} onValueChange={setCareMessages} trackColor={{ false: Colors.border.light, true: Colors.primary.teal }} thumbColor="#FFF" />
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.semantic.error} />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  editBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  patientCard: { backgroundColor: Colors.primary.navy, marginHorizontal: 16, borderRadius: 20, padding: 20, marginTop: 12 },
  patientTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary.teal, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  patientInfo: { marginLeft: 16, flex: 1 },
  patientName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  patientMeta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.semantic.success, marginRight: 6 },
  statusText: { fontSize: 13, color: Colors.semantic.success, fontWeight: '500' },
  surgeryInfo: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 },
  surgeryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  surgeryType: { fontSize: 17, fontWeight: '600', color: '#FFF', marginBottom: 12 },
  surgeryMeta: { flexDirection: 'row', gap: 32 },
  metaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, color: '#FFF', fontWeight: '500', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, letterSpacing: 1, marginTop: 28, marginBottom: 12, marginLeft: 24 },
  teamRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  teamCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', ...Shadow.sm },
  teamAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  teamAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  teamRole: { fontSize: 11, fontWeight: '600', color: Colors.primary.teal, letterSpacing: 0.5, marginBottom: 4 },
  teamName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, textAlign: 'center' },
  teamSpec: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  teamActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  teamActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(26,158,143,0.1)', justifyContent: 'center', alignItems: 'center' },
  notifCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 16, padding: 4, ...Shadow.sm },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  notifLabel: { fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
  notifDivider: { height: 1, backgroundColor: Colors.border.light, marginHorizontal: 20 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 16, marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, ...Shadow.sm },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.semantic.error },
});
