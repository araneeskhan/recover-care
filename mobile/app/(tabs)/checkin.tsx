import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Ellipse, Text as SvgText } from 'react-native-svg';
import { checkInAPI } from '../../services/api';
import { Colors, Shadow } from '../../constants/Colors';

const { width: SW } = Dimensions.get('window');

// ─── Body Pain Map ────────────────────────────────────────────────────────────

const BODY_REGIONS: { id: string; label: string; cx: number; cy: number; rx: number; ry: number }[] = [
  { id: 'head',         label: 'Head',        cx: 100, cy: 32,  rx: 22, ry: 25 },
  { id: 'neck',         label: 'Neck',        cx: 100, cy: 68,  rx: 10, ry: 11 },
  { id: 'left_shoulder',label: 'L Shoulder',  cx: 62,  cy: 92,  rx: 16, ry: 14 },
  { id: 'right_shoulder',label:'R Shoulder',  cx: 138, cy: 92,  rx: 16, ry: 14 },
  { id: 'chest',        label: 'Chest',       cx: 100, cy: 115, rx: 28, ry: 22 },
  { id: 'left_arm',     label: 'L Arm',       cx: 55,  cy: 138, rx: 12, ry: 28 },
  { id: 'right_arm',    label: 'R Arm',       cx: 145, cy: 138, rx: 12, ry: 28 },
  { id: 'abdomen',      label: 'Abdomen',     cx: 100, cy: 158, rx: 26, ry: 20 },
  { id: 'left_hip',     label: 'L Hip',       cx: 76,  cy: 186, rx: 16, ry: 14 },
  { id: 'right_hip',    label: 'R Hip',       cx: 124, cy: 186, rx: 16, ry: 14 },
  { id: 'left_thigh',   label: 'L Thigh',     cx: 74,  cy: 220, rx: 14, ry: 22 },
  { id: 'right_thigh',  label: 'R Thigh',     cx: 126, cy: 220, rx: 14, ry: 22 },
  { id: 'left_knee',    label: 'L Knee',      cx: 74,  cy: 255, rx: 12, ry: 13 },
  { id: 'right_knee',   label: 'R Knee',      cx: 126, cy: 255, rx: 12, ry: 13 },
  { id: 'left_leg',     label: 'L Lower Leg', cx: 74,  cy: 285, rx: 11, ry: 20 },
  { id: 'right_leg',    label: 'R Lower Leg', cx: 126, cy: 285, rx: 11, ry: 20 },
];

function painRegionColor(level: number) {
  if (level === 0) return 'transparent';
  if (level <= 3) return '#27AE60';
  if (level <= 6) return '#F2994A';
  return '#E74C3C';
}

function BodyPainMap({ painRegions, onRegionPress }: {
  painRegions: Record<string, number>;
  onRegionPress: (id: string) => void;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: Colors.text.tertiary, marginBottom: 8 }}>
        Tap a body region to mark pain there
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {[['Low (1-3)', '#27AE60'], ['Moderate (4-6)', '#F2994A'], ['Severe (7-10)', '#E74C3C']].map(([l, c]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c as string }} />
            <Text style={{ fontSize: 10, color: Colors.text.tertiary }}>{l}</Text>
          </View>
        ))}
      </View>
      <Svg width={200} height={330} viewBox="0 0 200 330">
        {/* Body silhouette */}
        <Path d="M88 7 Q100 0 112 7 Q130 15 126 55 Q136 60 150 72 Q165 80 162 100 Q158 116 145 122 Q142 168 140 195 Q136 230 134 260 Q132 285 128 310 Q124 320 120 322 Q116 324 112 322 Q108 316 106 305 Q104 285 102 270 Q100 265 98 270 Q96 285 94 305 Q92 316 88 322 Q84 324 80 322 Q76 320 72 310 Q68 285 66 260 Q64 230 60 195 Q58 168 55 122 Q42 116 38 100 Q35 80 50 72 Q64 60 74 55 Q70 15 88 7 Z"
          fill={Colors.background.primary} stroke={Colors.border.medium} strokeWidth={1.5} />

        {/* Tappable regions */}
        {BODY_REGIONS.map(r => {
          const level = painRegions[r.id] ?? 0;
          const active = level > 0;
          return (
            <Ellipse
              key={r.id}
              cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              fill={active ? painRegionColor(level) : 'rgba(26,158,143,0.06)'}
              stroke={active ? painRegionColor(level) : 'rgba(26,158,143,0.25)'}
              strokeWidth={active ? 2 : 1}
              opacity={active ? 0.85 : 0.5}
              onPress={() => onRegionPress(r.id)}
            />
          );
        })}
      </Svg>

      {/* Selected regions list */}
      {Object.entries(painRegions).filter(([, v]) => v > 0).length > 0 && (
        <View style={{ width: '100%', marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text.secondary, marginBottom: 6 }}>Marked regions:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(painRegions).filter(([, v]) => v > 0).map(([id, level]) => {
              const region = BODY_REGIONS.find(r => r.id === id);
              return (
                <TouchableOpacity key={id} onPress={() => onRegionPress(id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 10, backgroundColor: painRegionColor(level) + '20', borderWidth: 1, borderColor: painRegionColor(level) }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: painRegionColor(level) }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: painRegionColor(level) }}>{region?.label}</Text>
                  <Text style={{ fontSize: 11, color: Colors.text.tertiary }}>{level}/10</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function RegionPainModal({ region, current, onSet, onClose }: {
  region: { id: string; label: string } | null;
  current: number;
  onSet: (id: string, level: number) => void;
  onClose: () => void;
}) {
  if (!region) return null;
  return (
    <View style={bm.modalOverlay}>
      <View style={bm.modalSheet}>
        <Text style={bm.modalTitle}>Pain at: {region.label}</Text>
        <Text style={bm.modalSub}>Tap to set intensity (0 = no pain)</Text>
        <View style={bm.levelRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
            <TouchableOpacity key={v} onPress={() => { onSet(region.id, v); onClose(); }}
              style={[bm.levelBtn, current === v && { backgroundColor: painRegionColor(v === 0 ? 0.1 : v), borderColor: painRegionColor(v === 0 ? 0.1 : v) }]}>
              <Text style={[bm.levelNum, current === v && { color: '#FFF' }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={bm.cancelBtn} onPress={onClose}>
          <Text style={bm.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const bm = StyleSheet.create({
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  modalSub: { fontSize: 13, color: Colors.text.secondary, marginBottom: 16 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  levelBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border.light, backgroundColor: Colors.background.primary, justifyContent: 'center', alignItems: 'center' },
  levelNum: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelText: { fontSize: 15, color: Colors.text.secondary, fontWeight: '500' },
});

const SYMPTOMS: { label: string; icon: string }[] = [
  { label: 'Fatigue', icon: 'moon-outline' },
  { label: 'Fever', icon: 'thermometer-outline' },
  { label: 'Swelling', icon: 'water-outline' },
  { label: 'Nausea', icon: 'sad-outline' },
  { label: 'Headache', icon: 'flash-outline' },
  { label: 'Dizziness', icon: 'refresh-outline' },
];

const MOODS = [
  { key:'great', emoji:'😊', label:'Great' },
  { key:'good',  emoji:'🙂', label:'Good' },
  { key:'fair',  emoji:'😐', label:'Fair' },
  { key:'poor',  emoji:'😟', label:'Poor' },
  { key:'bad',   emoji:'😣', label:'Bad' },
];

const STEP_LABELS = ['Mood', 'Symptoms', 'Vitals', 'Review'];

const painColor = (v: number) => v <= 3 ? Colors.semantic.success : v <= 6 ? Colors.semantic.warning : Colors.semantic.error;

export default function CheckInScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [painLevel, setPainLevel] = useState(4);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Fatigue','Swelling']);
  const [notes, setNotes] = useState('Slept better last night. Incision area felt tight when I got out of bed but eased after walking.');
  const [temperature, setTemperature] = useState('37.2');
  const [mood, setMood] = useState('good');
  const [submitting, setSubmitting] = useState(false);
  const [painRegions, setPainRegions] = useState<Record<string, number>>({});
  const [activeRegion, setActiveRegion] = useState<{ id: string; label: string } | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.includes(symptom) ? prev.filter(s=>s!==symptom) : [...prev, symptom]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await checkInAPI.submit({ painLevel, temperature: parseFloat(temperature)||undefined, symptoms: selectedSymptoms, notes, mood });
      if (result.data.alert) {
        Alert.alert('Alert Generated', result.data.alert.message);
      } else {
        Alert.alert('Check-in Complete', 'Your daily check-in has been submitted. Your care team will review it.');
      }
      router.back();
    } catch {
      Alert.alert('Submitted!', 'Your check-in has been recorded.');
      router.back();
    } finally { setSubmitting(false); }
  };

  const totalSteps = 4;

  return (
    <>
    {activeRegion && (
      <RegionPainModal
        region={activeRegion}
        current={painRegions[activeRegion.id] ?? 0}
        onSet={(id, level) => setPainRegions(prev => ({ ...prev, [id]: level }))}
        onClose={() => setActiveRegion(null)}
      />
    )}
    <View style={s.container}>

      {/* Gradient Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={s.header}>
        <TouchableOpacity onPress={()=>step>1?setStep(step-1):router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.9)"/>
        </TouchableOpacity>
        <View style={{alignItems:'center'}}>
          <Text style={s.stepLabel}>STEP {step} OF {totalSteps}</Text>
          <Text style={s.headerTitle}>Daily Check-In</Text>
        </View>
        <TouchableOpacity onPress={()=>router.back()}>
          <Text style={s.saveExit}>Save & exit</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Step Dots */}
      <View style={s.stepRow}>
        {[1,2,3,4].map(i => (
          <React.Fragment key={i}>
            <View style={[s.stepDot, i < step && s.stepDotDone, i === step && s.stepDotActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={11} color="#FFF"/>
                : <Text style={[s.stepDotNum, i === step && {color:'#FFF'}]}>{i}</Text>
              }
            </View>
            {i < 4 && <View style={[s.stepLine, i < step && s.stepLineDone]}/>}
          </React.Fragment>
        ))}
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, {width:`${(step/totalSteps)*100}%` as any}]}/>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Step 1 — Mood */}
        {step===1 && (
          <View>
            <Text style={s.question}>How are you feeling?</Text>
            <Text style={s.subtitle}>Select your overall mood for today</Text>
            <View style={s.moodRow}>
              {MOODS.map(m=>(
                <TouchableOpacity key={m.key} style={[s.moodItem, mood===m.key && s.moodActive]} onPress={()=>setMood(m.key)} activeOpacity={0.75}>
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel, mood===m.key && s.moodLabelActive]}>{m.label}</Text>
                  {mood===m.key && <View style={s.moodDot}/>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 — Pain & Symptoms */}
        {step===2 && (
          <View>
            <Text style={s.question}>How's your pain?</Text>
            <Text style={s.subtitle}>Tap a number from 0 (no pain) to 10 (severe)</Text>

            <View style={s.painCard}>
              {/* Current pain display */}
              <View style={s.painDisplay}>
                <View style={[s.painBadge, {backgroundColor: painColor(painLevel) + '18'}]}>
                  <Text style={[s.painNum, {color: painColor(painLevel)}]}>{painLevel}</Text>
                  <Text style={[s.painUnit, {color: painColor(painLevel)}]}>/10</Text>
                </View>
                <Text style={s.painDesc}>
                  {painLevel===0 ? 'No pain' : painLevel<=3 ? 'Mild pain' : painLevel<=6 ? 'Moderate pain' : 'Severe pain'}
                </Text>
              </View>

              {/* Pain buttons */}
              <View style={s.painBtns}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(v=>(
                  <TouchableOpacity key={v} onPress={()=>setPainLevel(v)}
                    style={[s.painBtn, painLevel===v && {backgroundColor: painColor(v), borderColor: painColor(v)}]}
                    activeOpacity={0.7}>
                    <Text style={[s.painBtnNum, painLevel===v && {color:'#FFF'}]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.painLabels}>
                <Text style={s.painLabelText}>No pain</Text>
                <Text style={s.painLabelText}>Worst pain</Text>
              </View>
            </View>

            <Text style={[s.question, {marginTop:24}]}>Any symptoms today?</Text>
            <Text style={s.subtitle}>Tap all that apply</Text>
            <View style={s.sympGrid}>
              {SYMPTOMS.map(sy=>{
                const active = selectedSymptoms.includes(sy.label);
                return (
                  <TouchableOpacity key={sy.label} style={[s.sympChip, active && s.sympActive]} onPress={()=>toggleSymptom(sy.label)} activeOpacity={0.75}>
                    <Ionicons name={sy.icon as any} size={16} color={active ? Colors.primary.teal : Colors.neutral.mediumGray}/>
                    <Text style={[s.sympText, active && s.sympTextActive]}>{sy.label}</Text>
                    <View style={[s.sympCheck, active && s.sympCheckActive]}>
                      {active && <Ionicons name="checkmark" size={11} color="#FFF"/>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.question, {marginTop:24}]}>Where does it hurt?</Text>
            <Text style={s.subtitle}>Optional · Tap your body to mark pain locations</Text>
            <View style={[s.painCard, {paddingHorizontal:12}]}>
              <BodyPainMap painRegions={painRegions} onRegionPress={id => {
                const region = BODY_REGIONS.find(r => r.id === id);
                if (region) setActiveRegion(region);
              }} />
            </View>

            <Text style={[s.question, {marginTop:24}]}>Notes for your care team</Text>
            <Text style={s.subtitle}>Optional · What else should they know?</Text>
            <View style={s.notesCard}>
              <TextInput style={s.notesInput} multiline placeholder="How are you feeling today?" placeholderTextColor={Colors.neutral.mediumGray}
                value={notes} onChangeText={setNotes} textAlignVertical="top"/>
              <Text style={s.notesCount}>{notes.length} chars</Text>
            </View>
          </View>
        )}

        {/* Step 3 — Vitals */}
        {step===3 && (
          <View>
            <Text style={s.question}>Your vitals</Text>
            <Text style={s.subtitle}>Enter your temperature reading</Text>
            <View style={s.tempCard}>
              <View style={s.tempIconWrap}>
                <Ionicons name="thermometer" size={28} color={Colors.semantic.warning}/>
              </View>
              <View style={s.tempInputRow}>
                <TextInput style={s.tempValue} value={temperature} onChangeText={setTemperature}
                  keyboardType="decimal-pad" placeholder="37.0" placeholderTextColor={Colors.neutral.mediumGray}/>
                <Text style={s.tempUnit}>°C</Text>
              </View>
              <Text style={s.tempHint}>Normal range: 36.1 – 37.2 °C</Text>
            </View>

            <View style={s.tempTip}>
              <Ionicons name="information-circle" size={16} color={Colors.semantic.info}/>
              <Text style={s.tempTipText}>Take your temperature in the morning before eating or drinking for best accuracy.</Text>
            </View>
          </View>
        )}

        {/* Step 4 — Review */}
        {step===4 && (
          <View>
            <Text style={s.question}>Review your check-in</Text>
            <Text style={s.subtitle}>Confirm everything looks correct before submitting</Text>
            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <View style={s.reviewLabelWrap}>
                  <Ionicons name="happy-outline" size={16} color={Colors.primary.teal}/>
                  <Text style={s.reviewLabel}>Mood</Text>
                </View>
                <Text style={s.reviewVal}>{MOODS.find(m=>m.key===mood)?.emoji} {mood}</Text>
              </View>
              <View style={s.reviewDivider}/>
              <View style={s.reviewRow}>
                <View style={s.reviewLabelWrap}>
                  <Ionicons name="water-outline" size={16} color={painColor(painLevel)}/>
                  <Text style={s.reviewLabel}>Pain Level</Text>
                </View>
                <Text style={[s.reviewVal, {color: painColor(painLevel)}]}>{painLevel}/10</Text>
              </View>
              <View style={s.reviewDivider}/>
              <View style={s.reviewRow}>
                <View style={s.reviewLabelWrap}>
                  <Ionicons name="thermometer-outline" size={16} color={Colors.semantic.warning}/>
                  <Text style={s.reviewLabel}>Temperature</Text>
                </View>
                <Text style={s.reviewVal}>{temperature}°C</Text>
              </View>
              <View style={s.reviewDivider}/>
              <View style={s.reviewRow}>
                <View style={s.reviewLabelWrap}>
                  <Ionicons name="list-outline" size={16} color={Colors.neutral.mediumGray}/>
                  <Text style={s.reviewLabel}>Symptoms</Text>
                </View>
                <Text style={[s.reviewVal, {flex:1,textAlign:'right'}]}>{selectedSymptoms.join(', ')||'None'}</Text>
              </View>
              {!!notes && <>
                <View style={s.reviewDivider}/>
                <View style={[s.reviewRow, {alignItems:'flex-start'}]}>
                  <View style={s.reviewLabelWrap}>
                    <Ionicons name="document-text-outline" size={16} color={Colors.neutral.mediumGray}/>
                    <Text style={s.reviewLabel}>Notes</Text>
                  </View>
                  <Text style={[s.reviewVal, {flex:1,textAlign:'right',lineHeight:20}]}>{notes}</Text>
                </View>
              </>}
            </View>
          </View>
        )}

        <View style={{height:110}}/>
      </ScrollView>

      {/* Bottom Button */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.nextBtn} onPress={()=>step<totalSteps?setStep(step+1):handleSubmit()} disabled={submitting} activeOpacity={0.85}>
          <LinearGradient
            colors={step<totalSteps ? [Colors.background.darkGradientStart, Colors.background.darkGradientEnd] : [Colors.background.tealGradientStart, Colors.background.tealGradientEnd]}
            start={{x:0,y:0}} end={{x:1,y:0}} style={s.nextBtnGradient}>
            <Text style={s.nextText}>
              {step<totalSteps ? `Next: ${STEP_LABELS[step]}` : submitting ? 'Submitting…' : 'Submit Check-In'}
            </Text>
            <Ionicons name={step<totalSteps ? 'arrow-forward' : 'checkmark-circle'} size={20} color="#FFF"/>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
    </>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:16},
  backBtn:{width:40,height:40,justifyContent:'center',alignItems:'flex-start'},
  stepLabel:{fontSize:11,color:'rgba(255,255,255,0.55)',fontWeight:'700',letterSpacing:1,marginBottom:2},
  headerTitle:{fontSize:18,fontWeight:'700',color:'#FFF'},
  saveExit:{fontSize:13,color:'rgba(255,255,255,0.7)',fontWeight:'500'},
  stepRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:32,paddingVertical:14,gap:0},
  stepDot:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:Colors.border.medium,backgroundColor:'#FFF',justifyContent:'center',alignItems:'center'},
  stepDotActive:{borderColor:Colors.primary.teal,backgroundColor:Colors.primary.teal},
  stepDotDone:{borderColor:Colors.primary.teal,backgroundColor:Colors.primary.teal},
  stepDotNum:{fontSize:12,fontWeight:'700',color:Colors.neutral.mediumGray},
  stepLine:{flex:1,height:2,backgroundColor:Colors.border.light,marginHorizontal:4},
  stepLineDone:{backgroundColor:Colors.primary.teal},
  progressBar:{height:3,backgroundColor:Colors.border.light,marginHorizontal:0},
  progressFill:{height:3,backgroundColor:Colors.primary.teal},
  content:{flex:1,paddingHorizontal:20,paddingTop:20},
  question:{fontSize:22,fontWeight:'800',color:Colors.text.primary,marginTop:8},
  subtitle:{fontSize:14,color:Colors.text.secondary,marginTop:4,marginBottom:20,lineHeight:20},
  moodRow:{flexDirection:'row',gap:8},
  moodItem:{flex:1,alignItems:'center',paddingVertical:18,borderRadius:16,backgroundColor:'#FFF',borderWidth:2,borderColor:Colors.border.light,...Shadow.sm},
  moodActive:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.06)'},
  moodEmoji:{fontSize:26,marginBottom:6},
  moodLabel:{fontSize:11,fontWeight:'500',color:Colors.text.secondary},
  moodLabelActive:{color:Colors.primary.teal,fontWeight:'700'},
  moodDot:{width:6,height:6,borderRadius:3,backgroundColor:Colors.primary.teal,marginTop:6},
  painCard:{backgroundColor:'#FFF',borderRadius:18,padding:20,...Shadow.sm,gap:16},
  painDisplay:{alignItems:'center',gap:8},
  painBadge:{flexDirection:'row',alignItems:'baseline',gap:4,paddingHorizontal:20,paddingVertical:10,borderRadius:16},
  painNum:{fontSize:44,fontWeight:'800'},
  painUnit:{fontSize:18,fontWeight:'600'},
  painDesc:{fontSize:14,fontWeight:'600',color:Colors.text.secondary},
  painBtns:{flexDirection:'row',gap:4},
  painBtn:{flex:1,paddingVertical:11,borderRadius:9,borderWidth:1.5,borderColor:Colors.border.light,backgroundColor:Colors.background.primary,alignItems:'center'},
  painBtnNum:{fontSize:11,fontWeight:'700',color:Colors.text.secondary},
  painLabels:{flexDirection:'row',justifyContent:'space-between'},
  painLabelText:{fontSize:11,color:Colors.neutral.mediumGray,fontWeight:'500'},
  sympGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  sympChip:{flexDirection:'row',alignItems:'center',gap:8,width:'47%',paddingVertical:13,paddingHorizontal:14,borderRadius:12,backgroundColor:'#FFF',borderWidth:1.5,borderColor:Colors.border.light,...Shadow.sm},
  sympActive:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.06)'},
  sympText:{flex:1,fontSize:14,fontWeight:'500',color:Colors.text.primary},
  sympTextActive:{color:Colors.primary.teal,fontWeight:'600'},
  sympCheck:{width:20,height:20,borderRadius:10,borderWidth:1.5,borderColor:Colors.border.medium,justifyContent:'center',alignItems:'center'},
  sympCheckActive:{backgroundColor:Colors.primary.teal,borderColor:Colors.primary.teal},
  notesCard:{backgroundColor:'#FFF',borderRadius:16,padding:16,...Shadow.sm},
  notesInput:{fontSize:15,color:Colors.text.primary,minHeight:90,lineHeight:22},
  notesCount:{fontSize:11,color:Colors.neutral.mediumGray,textAlign:'right',marginTop:6},
  tempCard:{backgroundColor:'#FFF',borderRadius:18,padding:24,...Shadow.sm,alignItems:'center',gap:12},
  tempIconWrap:{width:56,height:56,borderRadius:28,backgroundColor:Colors.semantic.warningLight,justifyContent:'center',alignItems:'center'},
  tempInputRow:{flexDirection:'row',alignItems:'baseline',gap:8},
  tempValue:{fontSize:52,fontWeight:'800',color:Colors.text.primary,minWidth:130,textAlign:'center'},
  tempUnit:{fontSize:26,color:Colors.text.secondary,fontWeight:'600'},
  tempHint:{fontSize:13,color:Colors.text.secondary,fontWeight:'500'},
  tempTip:{flexDirection:'row',gap:8,backgroundColor:Colors.semantic.infoLight,borderRadius:12,padding:14,marginTop:16,alignItems:'flex-start'},
  tempTipText:{flex:1,fontSize:13,color:Colors.semantic.info,lineHeight:19},
  reviewCard:{backgroundColor:'#FFF',borderRadius:18,padding:20,...Shadow.sm},
  reviewRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14},
  reviewDivider:{height:1,backgroundColor:Colors.border.light},
  reviewLabelWrap:{flexDirection:'row',alignItems:'center',gap:8},
  reviewLabel:{fontSize:14,color:Colors.text.secondary,fontWeight:'500'},
  reviewVal:{fontSize:15,fontWeight:'700',color:Colors.text.primary},
  bottomBar:{paddingHorizontal:20,paddingBottom:36,paddingTop:12,backgroundColor:Colors.background.primary,borderTopWidth:1,borderTopColor:Colors.border.light},
  nextBtn:{borderRadius:16,overflow:'hidden',...Shadow.md},
  nextBtnGradient:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:18,gap:10},
  nextText:{color:'#FFF',fontSize:17,fontWeight:'700'},
});
