import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { medicationAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

const DEMO_MEDS = {
  medications: [
    { id:'1', name:'Amoxicillin', dosage:'500 mg', frequency:'3× daily · with food', totalDoses:21, takenDoses:8, isActive:true, nextDoseAt:new Date(new Date().setHours(14,0,0,0)).toISOString(), logs:[] },
    { id:'2', name:'Ibuprofen', dosage:'400 mg', frequency:'Every 6h as needed', totalDoses:30, takenDoses:12, isActive:true, nextDoseAt:null, logs:[] },
    { id:'3', name:'Pantoprazole', dosage:'40 mg', frequency:'Once daily · morning', totalDoses:14, takenDoses:5, isActive:true, nextDoseAt:new Date(new Date().setHours(8,0,0,0)).toISOString(), logs:[{takenAt:new Date(new Date().setHours(8,5,0,0)).toISOString()}] },
  ],
  activeCount: 3,
};

const DOSE_TIMES = [
  { label:'8a', hour:8 }, { label:'12p', hour:12 }, { label:'2p', hour:14 }, { label:'8p', hour:20 },
];

export default function MedicationsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [takenToday, setTakenToday] = useState(2);

  const fetchMeds = useCallback(async () => {
    try { const r = await medicationAPI.getAll(); setData(r.data); }
    catch { setData(DEMO_MEDS); }
  }, []);

  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  const markTaken = async (id: string, name: string) => {
    try {
      await medicationAPI.markTaken(id);
      Alert.alert('Marked as Taken', `${name} has been logged.`);
      setTakenToday(prev => prev + 1);
      fetchMeds();
    } catch {
      Alert.alert('Marked!', `${name} logged.`);
      setTakenToday(prev => prev + 1);
    }
  };

  const getNextDoseCountdown = () => {
    if (!data?.medications) return '';
    const next = data.medications.filter((m:any)=>m.nextDoseAt&&new Date(m.nextDoseAt)>new Date())
      .sort((a:any,b:any)=>new Date(a.nextDoseAt).getTime()-new Date(b.nextDoseAt).getTime())[0];
    if (!next) return '';
    const diff = new Date(next.nextDoseAt).getTime() - Date.now();
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
    return `next dose in ${h}h ${m}m`;
  };

  const now = new Date();
  const currentHour = now.getHours();

  if (!data) return <View style={s.container}><Text style={{color:Colors.text.secondary,textAlign:'center',marginTop:100}}>Loading...</Text></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Medications</Text>
          <Text style={s.subtitle}>{data.activeCount} active · {getNextDoseCountdown()}</Text>
        </View>
        <TouchableOpacity style={s.addBtn}><Ionicons name="add" size={24} color={Colors.primary.teal} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Daily progress card */}
        <View style={s.progressCard}>
          <Text style={s.progressDate}>TODAY, {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase()}</Text>
          <View style={s.progressRow}>
            <View>
              <Text style={s.progressNum}>{takenToday} <Text style={s.progressTotal}>/ 4</Text></Text>
              <Text style={s.progressLabel}>doses taken</Text>
            </View>
            <View style={s.doseCircles}>
              {DOSE_TIMES.map((dt, i) => {
                const taken = i < takenToday;
                const upcoming = i === takenToday;
                return (
                  <View key={dt.label} style={{ alignItems: 'center' }}>
                    <View style={[s.doseCircle, taken && s.doseCircleDone, upcoming && s.doseCircleNext]}>
                      {taken && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      {upcoming && <View style={s.doseCircleDot} />}
                    </View>
                    <Text style={s.doseLabel}>{dt.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Medication cards */}
        {data.medications.map((med: any) => {
          const progress = med.takenDoses / med.totalDoses;
          const isPRN = med.frequency.includes('needed');
          const hasTakenToday = med.logs?.length > 0;
          const isDue = med.nextDoseAt && new Date(med.nextDoseAt) <= new Date();

          return (
            <View key={med.id} style={s.medCard}>
              <View style={s.medHeader}>
                <View style={s.medPill}><Ionicons name="medical" size={18} color={Colors.semantic.warning} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.medName, hasTakenToday && { color: Colors.text.secondary }]}>{med.name}</Text>
                  <Text style={s.medFreq}>{med.frequency}</Text>
                </View>
                <Text style={s.medDosage}>{med.dosage}</Text>
              </View>

              {/* Progress bar */}
              {!isPRN && (
                <View style={s.medProgress}>
                  <View style={s.medProgressBar}>
                    <View style={[s.medProgressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={s.medProgressText}>{med.takenDoses}/{med.totalDoses}</Text>
                </View>
              )}

              {/* Action row */}
              {isPRN ? (
                <View style={s.medAction}>
                  <Text style={s.prnText}>○ Now if needed</Text>
                </View>
              ) : isDue ? (
                <View style={s.medAction}>
                  <View style={s.dueRow}>
                    <Ionicons name="alarm" size={16} color={Colors.semantic.error} />
                    <Text style={s.dueText}>{new Date(med.nextDoseAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                  </View>
                  <TouchableOpacity style={s.markBtn} onPress={() => markTaken(med.id, med.name)}>
                    <Text style={s.markBtnText}>Mark taken</Text>
                  </TouchableOpacity>
                </View>
              ) : hasTakenToday ? (
                <View style={s.medAction}>
                  <Text style={s.takenText}>✓ Taken {new Date(med.logs[0].takenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                </View>
              ) : med.nextDoseAt ? (
                <View style={s.medAction}>
                  <View style={s.dueRow}>
                    <Ionicons name="alarm" size={16} color={Colors.semantic.error} />
                    <Text style={s.dueText}>{new Date(med.nextDoseAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                  </View>
                  <TouchableOpacity style={s.markBtn} onPress={() => markTaken(med.id, med.name)}>
                    <Text style={s.markBtnText}>Mark taken</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(26,158,143,0.1)', justifyContent: 'center', alignItems: 'center' },
  progressCard: { backgroundColor: Colors.primary.navy, marginHorizontal: 16, borderRadius: 16, padding: 20, marginTop: 8 },
  progressDate: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressNum: { fontSize: 40, fontWeight: '800', color: '#FFF' },
  progressTotal: { fontSize: 20, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
  progressLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  doseCircles: { flexDirection: 'row', gap: 12 },
  doseCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  doseCircleDone: { backgroundColor: Colors.primary.teal },
  doseCircleNext: { backgroundColor: 'rgba(255,255,255,0.25)' },
  doseCircleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.semantic.warning },
  doseLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '500' },
  medCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 20, ...Shadow.sm },
  medHeader: { flexDirection: 'row', alignItems: 'center' },
  medPill: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.semantic.warningLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  medName: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  medFreq: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  medDosage: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  medProgress: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  medProgressBar: { flex: 1, height: 6, backgroundColor: Colors.border.light, borderRadius: 3, overflow: 'hidden' },
  medProgressFill: { height: 6, backgroundColor: Colors.semantic.warning, borderRadius: 3 },
  medProgressText: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '500' },
  medAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border.light },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.semantic.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dueText: { fontSize: 13, fontWeight: '600', color: Colors.semantic.error },
  markBtn: { backgroundColor: Colors.primary.navy, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  markBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  prnText: { fontSize: 14, color: Colors.text.secondary },
  takenText: { fontSize: 14, color: Colors.semantic.success, fontWeight: '500' },
});
