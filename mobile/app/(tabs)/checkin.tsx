import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { checkInAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';

const SYMPTOMS = ['Fatigue','Fever','Swelling','Nausea','Headache','Dizziness'];
const MOODS = [
  { key:'great', emoji:'😊', label:'Great' },
  { key:'good', emoji:'🙂', label:'Good' },
  { key:'fair', emoji:'😐', label:'Fair' },
  { key:'poor', emoji:'😟', label:'Poor' },
  { key:'bad', emoji:'😣', label:'Bad' },
];

export default function CheckInScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [painLevel, setPainLevel] = useState(4);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Fatigue','Swelling']);
  const [notes, setNotes] = useState('Slept better last night. Incision area felt tight when I got out of bed but eased after walking.');
  const [temperature, setTemperature] = useState('37.2');
  const [mood, setMood] = useState('good');
  const [submitting, setSubmitting] = useState(false);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.includes(symptom) ? prev.filter(s=>s!==symptom) : [...prev, symptom]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await checkInAPI.submit({
        painLevel, temperature: parseFloat(temperature)||undefined, symptoms: selectedSymptoms, notes, mood,
      });
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

  const getPainEmoji = () => painLevel<=2?'😊':painLevel<=5?'🙂':painLevel<=7?'😟':'😣';
  const totalSteps = 4;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={()=>step>1?setStep(step-1):router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary}/>
        </TouchableOpacity>
        <View>
          <Text style={s.stepLabel}>STEP {step} OF {totalSteps}</Text>
          <Text style={s.headerTitle}>Daily Check-In</Text>
        </View>
        <TouchableOpacity onPress={()=>router.back()}>
          <Text style={s.saveExit}>Save & exit</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill,{width:`${(step/totalSteps)*100}%`}]}/>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {step===1 && (
          <View>
            <Text style={s.question}>How are you feeling?</Text>
            <Text style={s.subtitle}>Select your overall mood</Text>
            <View style={s.moodRow}>
              {MOODS.map(m=>(
                <TouchableOpacity key={m.key} style={[s.moodItem,mood===m.key&&s.moodActive]} onPress={()=>setMood(m.key)}>
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[s.moodLabel,mood===m.key&&s.moodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step===2 && (
          <View>
            <Text style={s.question}>How's your pain?</Text>
            <Text style={s.subtitle}>Slide to rate from 0 (none) to 10 (severe)</Text>
            <View style={s.painCard}>
              <View style={s.painHeader}>
                <Text style={{fontSize:32}}>🙂</Text>
                <View style={{alignItems:'center'}}>
                  <Text style={s.painNum}>{painLevel}</Text>
                  <Text style={s.painUnit}>out of 10</Text>
                </View>
                <Text style={{fontSize:32}}>😣</Text>
              </View>
              {/* Slider */}
              <View style={s.sliderTrack}>
                <View style={[s.sliderFill,{width:`${(painLevel/10)*100}%`}]}/>
                <View style={[s.sliderThumb,{left:`${(painLevel/10)*100}%`}]}/>
              </View>
              <View style={s.sliderLabels}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(v=>(
                  <TouchableOpacity key={v} onPress={()=>setPainLevel(v)} style={s.sliderTap}>
                    {v%5===0&&<Text style={s.sliderNum}>{v}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={s.question}>Any symptoms today?</Text>
            <Text style={s.subtitle}>Tap all that apply</Text>
            <View style={s.sympGrid}>
              {SYMPTOMS.map(sy=>(
                <TouchableOpacity key={sy} style={[s.sympChip,selectedSymptoms.includes(sy)&&s.sympActive]} onPress={()=>toggleSymptom(sy)}>
                  <Text style={[s.sympText,selectedSymptoms.includes(sy)&&s.sympTextActive]}>{sy}</Text>
                  <View style={[s.sympCheck,selectedSymptoms.includes(sy)&&s.sympCheckActive]}>
                    {selectedSymptoms.includes(sy)&&<Ionicons name="checkmark" size={14} color="#FFF"/>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.question}>Notes for your care team</Text>
            <Text style={s.subtitle}>Optional</Text>
            <View style={s.notesCard}>
              <TextInput style={s.notesInput} multiline placeholder="How are you feeling today?" placeholderTextColor={Colors.neutral.mediumGray}
                value={notes} onChangeText={setNotes} textAlignVertical="top"/>
            </View>
          </View>
        )}

        {step===3 && (
          <View>
            <Text style={s.question}>Your vitals</Text>
            <Text style={s.subtitle}>Enter your temperature reading</Text>
            <View style={s.tempCard}>
              <Ionicons name="thermometer" size={32} color={Colors.semantic.warning}/>
              <View style={s.tempInput}>
                <TextInput style={s.tempValue} value={temperature} onChangeText={setTemperature}
                  keyboardType="decimal-pad" placeholder="37.0"/>
                <Text style={s.tempUnit}>°C</Text>
              </View>
            </View>
          </View>
        )}

        {step===4 && (
          <View>
            <Text style={s.question}>Review your check-in</Text>
            <Text style={s.subtitle}>Confirm everything looks correct</Text>
            <View style={s.reviewCard}>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Mood</Text><Text style={s.reviewVal}>{MOODS.find(m=>m.key===mood)?.emoji} {mood}</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Pain Level</Text><Text style={s.reviewVal}>{painLevel}/10</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Temperature</Text><Text style={s.reviewVal}>{temperature}°C</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Symptoms</Text><Text style={s.reviewVal}>{selectedSymptoms.join(', ')||'None'}</Text></View>
              {notes?<View style={s.reviewRow}><Text style={s.reviewLabel}>Notes</Text><Text style={[s.reviewVal,{flex:1}]}>{notes}</Text></View>:null}
            </View>
          </View>
        )}
        <View style={{height:100}}/>
      </ScrollView>

      {/* Bottom button */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.nextBtn} onPress={()=>step<totalSteps?setStep(step+1):handleSubmit()} disabled={submitting} activeOpacity={0.8}>
          <Text style={s.nextText}>{step<totalSteps?`Next: ${['Mood','Symptoms','Vitals','Review'][step]}`:'Submit Check-In'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF"/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:12},
  backBtn:{width:40,height:40,justifyContent:'center'},
  stepLabel:{fontSize:11,color:Colors.neutral.mediumGray,fontWeight:'600',letterSpacing:0.5},
  headerTitle:{fontSize:20,fontWeight:'700',color:Colors.text.primary},
  saveExit:{fontSize:13,color:Colors.primary.teal,fontWeight:'500'},
  progressBar:{height:4,backgroundColor:Colors.border.light,marginHorizontal:20},
  progressFill:{height:4,backgroundColor:Colors.primary.teal,borderRadius:2},
  content:{flex:1,paddingHorizontal:20,paddingTop:24},
  question:{fontSize:22,fontWeight:'700',color:Colors.text.primary,marginTop:8},
  subtitle:{fontSize:14,color:Colors.text.secondary,marginTop:4,marginBottom:20},
  moodRow:{flexDirection:'row',justifyContent:'space-between',gap:8},
  moodItem:{flex:1,alignItems:'center',paddingVertical:20,borderRadius:16,backgroundColor:'#FFF',borderWidth:2,borderColor:Colors.border.light,...Shadow.sm},
  moodActive:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.05)'},
  moodEmoji:{fontSize:28,marginBottom:8},
  moodLabel:{fontSize:12,fontWeight:'500',color:Colors.text.secondary},
  moodLabelActive:{color:Colors.primary.teal,fontWeight:'600'},
  painCard:{backgroundColor:'#FFF',borderRadius:16,padding:24,...Shadow.sm},
  painHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  painNum:{fontSize:40,fontWeight:'800',color:Colors.text.primary},
  painUnit:{fontSize:13,color:Colors.text.secondary},
  sliderTrack:{height:8,backgroundColor:Colors.border.light,borderRadius:4,position:'relative'},
  sliderFill:{height:8,borderRadius:4,backgroundColor:Colors.primary.teal},
  sliderThumb:{position:'absolute',top:-8,width:24,height:24,borderRadius:12,backgroundColor:'#FFF',borderWidth:3,borderColor:Colors.primary.teal,marginLeft:-12,...Shadow.md},
  sliderLabels:{flexDirection:'row',justifyContent:'space-between',marginTop:8},
  sliderTap:{padding:4},
  sliderNum:{fontSize:12,color:Colors.text.secondary},
  sympGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},
  sympChip:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:'47%',paddingVertical:14,paddingHorizontal:16,borderRadius:12,backgroundColor:'#FFF',borderWidth:1.5,borderColor:Colors.border.light},
  sympActive:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.06)'},
  sympText:{fontSize:15,fontWeight:'500',color:Colors.text.primary},
  sympTextActive:{color:Colors.primary.teal,fontWeight:'600'},
  sympCheck:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:Colors.border.medium,justifyContent:'center',alignItems:'center'},
  sympCheckActive:{backgroundColor:Colors.primary.teal,borderColor:Colors.primary.teal},
  notesCard:{backgroundColor:'#FFF',borderRadius:16,padding:16,...Shadow.sm,marginTop:4},
  notesInput:{fontSize:15,color:Colors.text.primary,minHeight:80,lineHeight:22},
  tempCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:16,padding:24,gap:20,...Shadow.sm},
  tempInput:{flexDirection:'row',alignItems:'baseline'},
  tempValue:{fontSize:48,fontWeight:'700',color:Colors.text.primary,minWidth:120},
  tempUnit:{fontSize:24,color:Colors.text.secondary},
  reviewCard:{backgroundColor:'#FFF',borderRadius:16,padding:20,...Shadow.sm},
  reviewRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:14,borderBottomWidth:1,borderBottomColor:Colors.border.light},
  reviewLabel:{fontSize:14,color:Colors.text.secondary},
  reviewVal:{fontSize:15,fontWeight:'600',color:Colors.text.primary},
  bottomBar:{paddingHorizontal:20,paddingBottom:34,paddingTop:12,backgroundColor:Colors.background.primary},
  nextBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:Colors.primary.navy,paddingVertical:18,borderRadius:16,gap:8},
  nextText:{color:'#FFF',fontSize:17,fontWeight:'600'},
});
