import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { patientAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';
import Svg, { Circle } from 'react-native-svg';

function RecoveryRing({ currentDay, totalDays, size = 120 }: { currentDay: number; totalDays: number; size?: number }) {
  const sw = 10, r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={Colors.primary.teal} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - currentDay/totalDays)} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' }}>DAY</Text>
        <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '700' }}>{currentDay}</Text>
      </View>
    </View>
  );
}

const DEMO = {
  patient: { firstName: 'Sarah' },
  recovery: { currentDay: 5, totalDays: 14, daysRemaining: 9, isOnTrack: true },
  vitals: { painLevel: 3, temperature: 37.2, lastCheckInTime: new Date().toISOString() },
  hasCheckedInToday: false,
  medications: [{ id: '1', name: 'Amoxicillin', dosage: '500mg', nextDoseAt: new Date(new Date().setHours(14,0,0,0)).toISOString() }],
  appointments: [{ id: '1', title: 'Call with Dr. Patel', description: 'Post-op review · 15 min', dateTime: new Date(Date.now() + 3*86400000).toISOString() }],
  unreadMessages: 2,
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try { const r = await patientAPI.getDashboard(); setD(r.data); }
    catch { setD(DEMO); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
  const fmtDate = (s: string) => { const d=new Date(s); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${fmtTime(s)}`; };
  const relTime = (s: string) => { const h=Math.floor((new Date(s).getTime()-Date.now())/3600000); const dy=Math.floor(h/24); return dy>0?`in ${dy} day${dy>1?'s':''}`:h>0?`in ${h}h`:'soon'; };

  if (!d) return <View style={[s.container,{justifyContent:'center',alignItems:'center'}]}><Text style={{color:Colors.neutral.mediumGray}}>Loading...</Text></View>;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal}/>}>
      <LinearGradient colors={[Colors.background.darkGradientStart,Colors.background.darkGradientEnd]} style={s.header}>
        <View style={s.greetRow}>
          <View>
            <Text style={s.dateText}>{days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}</Text>
            <Text style={s.greetText}>{greeting},{'\n'}{d.patient?.firstName||user?.firstName||'Patient'}</Text>
          </View>
          <TouchableOpacity style={s.bell} onPress={()=>router.push('/alerts')}>
            <Ionicons name="notifications-outline" size={24} color="#FFF"/>
            {d.unreadMessages>0&&<View style={s.bellDot}/>}
          </TouchableOpacity>
        </View>
        <View style={s.recoverySec}>
          <RecoveryRing currentDay={d.recovery.currentDay} totalDays={d.recovery.totalDays}/>
          <View style={{flex:1}}>
            <Text style={s.recLabel}>RECOVERY PROGRESS</Text>
            <Text style={s.recTitle}>Day {d.recovery.currentDay} of {d.recovery.totalDays}</Text>
            <Text style={s.recSub}>{d.recovery.daysRemaining} days until clearance.</Text>
            <Text style={s.recStatus}>{d.recovery.isOnTrack?'✓ Healing on track.':'⚠ Needs attention'}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.vitals}>
        <View style={s.vi}><View style={s.viRow}><Ionicons name="water" size={14} color={Colors.semantic.error}/><Text style={s.viL}>PAIN</Text></View><Text style={s.viV}>{d.vitals?.painLevel??'-'}<Text style={s.viU}>/10</Text></Text></View>
        <View style={[s.vi,s.viB]}><View style={s.viRow}><Ionicons name="thermometer" size={14} color={Colors.semantic.warning}/><Text style={s.viL}>TEMP</Text></View><Text style={s.viV}>{d.vitals?.temperature?.toFixed(1)??'-'}<Text style={s.viU}>°C</Text></Text></View>
        <View style={s.vi}><View style={s.viRow}><Ionicons name="time" size={14} color={Colors.neutral.mediumGray}/><Text style={s.viL}>LAST CHECK</Text></View><Text style={s.viV}>{d.vitals?.lastCheckInTime?fmtTime(d.vitals.lastCheckInTime).toLowerCase():'-'}</Text></View>
      </View>

      {!d.hasCheckedInToday&&<TouchableOpacity style={s.cta} onPress={()=>router.push('/(tabs)/checkin')} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.background.tealGradientStart,Colors.background.tealGradientEnd]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.ctaG}>
          <View><Text style={s.ctaL}>TODAY'S TASK</Text><Text style={s.ctaT}>Complete today's{'\n'}check-in</Text><Text style={s.ctaS}>Takes about 2 minutes</Text></View>
          <View style={s.ctaArr}><Ionicons name="arrow-forward" size={24} color={Colors.primary.teal}/></View>
        </LinearGradient>
      </TouchableOpacity>}

      {/* Quick Actions */}
      <View style={s.secH}><Text style={s.secT}>Quick Actions</Text></View>
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/history')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:'rgba(26,158,143,0.12)'}]}><Ionicons name="analytics" size={22} color={Colors.primary.teal}/></View>
          <Text style={s.quickLabel}>Trends</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/appointments')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:Colors.semantic.infoLight}]}><Ionicons name="calendar" size={22} color={Colors.semantic.info}/></View>
          <Text style={s.quickLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/medications')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:Colors.semantic.warningLight}]}><Ionicons name="medical" size={22} color={Colors.semantic.warning}/></View>
          <Text style={s.quickLabel}>Medications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>{
          Alert.alert(
            '🚨 Emergency SOS',
            'This will call emergency services. Are you sure?',
            [{text:'Cancel',style:'cancel'},{text:'Call 911',style:'destructive',onPress:()=>Linking.openURL('tel:911')}]
          );
        }} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:Colors.semantic.errorLight}]}><Ionicons name="alert-circle" size={22} color={Colors.semantic.error}/></View>
          <Text style={s.quickLabel}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* More Actions */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/wound-journal')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:'rgba(142,68,173,0.1)'}]}><Ionicons name="bandage" size={22} color="#8E44AD"/></View>
          <Text style={s.quickLabel}>Wound Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/health-report')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:'rgba(52,152,219,0.1)'}]}><Ionicons name="document-text" size={22} color="#3498DB"/></View>
          <Text style={s.quickLabel}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/symptom-glossary')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:'rgba(39,174,96,0.1)'}]}><Ionicons name="book" size={22} color="#27AE60"/></View>
          <Text style={s.quickLabel}>Symptoms</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={()=>router.push('/resources')} activeOpacity={0.7}>
          <View style={[s.quickIc,{backgroundColor:'rgba(26,158,143,0.06)'}]}><Ionicons name="library" size={22} color={Colors.primary.teal}/></View>
          <Text style={s.quickLabel}>Resources</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Recovery Tips */}
      <View style={s.secH}><Text style={s.secT}>Today's Recovery Tip</Text></View>
      {(() => {
        const day = d.recovery?.currentDay || 1;
        const tips = [
          { day: 1, emoji: '🛌', title: 'Rest Is Recovery', text: 'Your body does its best healing while you rest. Aim for 8–10 hours of sleep tonight.', color: '#8E44AD' },
          { day: 2, emoji: '🚶', title: 'Start Moving Gently', text: 'Take a short 5-minute walk every few hours. Movement prevents blood clots and aids healing.', color: '#3498DB' },
          { day: 3, emoji: '💧', title: 'Stay Hydrated', text: 'Drink 8+ glasses of water today. Proper hydration supports wound healing and medication absorption.', color: '#1A9E8F' },
          { day: 4, emoji: '🍎', title: 'Fuel Your Recovery', text: 'Focus on protein-rich foods (eggs, fish, beans) to support tissue repair. Avoid processed foods.', color: '#27AE60' },
          { day: 5, emoji: '📸', title: 'Document Your Healing', text: 'Take a photo of your incision to track progress. Compare with yesterday — healing takes time!', color: '#F2994A' },
          { day: 6, emoji: '🧘', title: 'Mind-Body Connection', text: 'Try 5 minutes of deep breathing. Stress hormones can slow wound healing.', color: '#8E44AD' },
          { day: 7, emoji: '🎉', title: 'One Week Milestone!', text: 'You made it through the first week! Your incision should be less tender now. Keep up the great work.', color: '#E74C3C' },
          { day: 8, emoji: '🏃', title: 'Increase Activity', text: 'Try walking for 15 minutes today. Gradually increase duration but avoid heavy lifting.', color: '#3498DB' },
          { day: 9, emoji: '💊', title: 'Medication Check', text: 'Review your medication schedule. Some meds may be tapering off — consult your care team.', color: '#F2994A' },
          { day: 10, emoji: '🩹', title: 'Wound Care Reminder', text: 'Keep your incision clean and dry. It\'s normal for it to itch as it heals — don\'t scratch!', color: '#E74C3C' },
          { day: 11, emoji: '😊', title: 'Emotional Check-In', text: 'Feeling frustrated or down is normal during recovery. Talk to someone if you need support.', color: '#8E44AD' },
          { day: 12, emoji: '🥗', title: 'Anti-Inflammatory Foods', text: 'Add berries, leafy greens, and fatty fish to your diet to reduce inflammation naturally.', color: '#27AE60' },
          { day: 13, emoji: '🔔', title: 'Prepare for Follow-Up', text: 'Your follow-up appointment is coming. Write down any questions for your doctor.', color: '#3498DB' },
          { day: 14, emoji: '🏆', title: 'Recovery Complete!', text: 'Congratulations on completing your recovery period! Continue following care instructions.', color: '#1A9E8F' },
        ];
        const tip = tips[Math.min(day - 1, tips.length - 1)];
        return (
          <TouchableOpacity style={s.tipCard} activeOpacity={0.85}>
            <View style={[s.tipEmoji, { backgroundColor: tip.color + '15' }]}><Text style={{ fontSize: 28 }}>{tip.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: tip.color }]}>{tip.title}</Text>
              <Text style={s.tipText}>{tip.text}</Text>
              <Text style={s.tipDay}>Day {day} tip</Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      <View style={s.secH}><Text style={s.secT}>Upcoming</Text><TouchableOpacity onPress={()=>router.push('/appointments')}><Text style={s.seeAll}>See all</Text></TouchableOpacity></View>

      {d.medications?.filter((m:any)=>m.nextDoseAt)?.slice(0,1).map((m:any)=>(
        <TouchableOpacity key={m.id} style={s.upCard} onPress={()=>router.push('/medications')} activeOpacity={0.7}>
          <View style={[s.upIc,{backgroundColor:Colors.semantic.warningLight}]}><Ionicons name="medical" size={20} color={Colors.semantic.warning}/></View>
          <View style={s.upInfo}><Text style={s.upT}>Take {m.name}</Text><Text style={s.upD}>{m.dosage} · with food</Text></View>
          <View style={{alignItems:'flex-end'}}><Text style={s.upTime}>{fmtTime(m.nextDoseAt)}</Text><Text style={s.upRel}>{relTime(m.nextDoseAt)}</Text></View>
        </TouchableOpacity>))}

      {d.appointments?.slice(0,1).map((a:any)=>(
        <TouchableOpacity key={a.id} style={s.upCard} onPress={()=>router.push('/appointments')} activeOpacity={0.7}>
          <View style={[s.upIc,{backgroundColor:Colors.semantic.infoLight}]}><Ionicons name="call" size={20} color={Colors.semantic.info}/></View>
          <View style={s.upInfo}><Text style={s.upT}>{a.title}</Text><Text style={s.upD}>{a.description}</Text></View>
          <View style={{alignItems:'flex-end'}}><Text style={s.upTime}>{fmtDate(a.dateTime)}</Text><Text style={s.upRel}>{relTime(a.dateTime)}</Text></View>
        </TouchableOpacity>))}

      {/* Milestones */}
      <View style={s.secH}><Text style={s.secT}>Recovery Milestones</Text></View>
      {(() => {
        const day = d.recovery?.currentDay || 1;
        const total = d.recovery?.totalDays || 14;
        const milestones = [
          { day: 1, title: 'Surgery Complete', desc: 'Your healing journey begins', emoji: '🏥', done: day >= 1 },
          { day: 3, title: 'First 72 Hours', desc: 'Critical healing period passed', emoji: '💪', done: day >= 3 },
          { day: 7, title: 'One Week', desc: 'Halfway through recovery', emoji: '🌟', done: day >= 7 },
          { day: 10, title: 'Almost There', desc: 'Final stretch of recovery', emoji: '🎯', done: day >= 10 },
          { day: total, title: 'Full Recovery', desc: 'Cleared by your care team', emoji: '🎉', done: day >= total },
        ];
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:10}}>
            {milestones.map((m,i) => (
              <View key={i} style={[s.mileCard, m.done && s.mileCardDone]}>
                <Text style={{fontSize:28}}>{m.emoji}</Text>
                <Text style={[s.mileTitle,m.done&&{color:Colors.primary.teal}]}>{m.title}</Text>
                <Text style={s.mileDesc}>{m.desc}</Text>
                <View style={[s.mileBadge,m.done?{backgroundColor:Colors.semantic.successLight}:{backgroundColor:Colors.background.primary}]}>
                  <Text style={[s.mileBadgeText,m.done&&{color:Colors.semantic.success}]}>
                    {m.done ? '✓ Complete' : `Day ${m.day}`}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        );
      })()}

      <View style={{height:30}}/>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background.primary},
  header:{paddingTop:60,paddingHorizontal:24,paddingBottom:32,borderBottomLeftRadius:24,borderBottomRightRadius:24},
  greetRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24},
  dateText:{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:4},
  greetText:{color:'#FFF',fontSize:24,fontWeight:'700',lineHeight:32},
  bell:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'},
  bellDot:{position:'absolute',top:10,right:12,width:8,height:8,borderRadius:4,backgroundColor:Colors.semantic.error},
  recoverySec:{flexDirection:'row',alignItems:'center',gap:24},
  recLabel:{color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:'600',letterSpacing:1,marginBottom:4},
  recTitle:{color:'#FFF',fontSize:20,fontWeight:'700'},
  recSub:{color:'rgba(255,255,255,0.6)',fontSize:13,marginTop:2},
  recStatus:{color:Colors.primary.tealLight,fontSize:13,marginTop:4},
  vitals:{flexDirection:'row',backgroundColor:'#FFF',marginHorizontal:16,marginTop:-20,borderRadius:16,paddingVertical:16,...Shadow.md},
  vi:{flex:1,alignItems:'center',paddingHorizontal:8},
  viB:{borderLeftWidth:1,borderRightWidth:1,borderColor:Colors.border.light},
  viRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  viL:{fontSize:10,fontWeight:'600',color:Colors.neutral.mediumGray,letterSpacing:0.5},
  viV:{fontSize:20,fontWeight:'700',color:Colors.text.primary},
  viU:{fontSize:13,fontWeight:'400',color:Colors.neutral.mediumGray},
  cta:{marginHorizontal:16,marginTop:20,borderRadius:20,overflow:'hidden',...Shadow.lg},
  ctaG:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:24,paddingHorizontal:24,borderRadius:20},
  ctaL:{color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:'600',letterSpacing:1,marginBottom:4},
  ctaT:{color:'#FFF',fontSize:20,fontWeight:'700',lineHeight:26},
  ctaS:{color:'rgba(255,255,255,0.7)',fontSize:13,marginTop:4},
  ctaArr:{width:48,height:48,borderRadius:24,backgroundColor:'#FFF',justifyContent:'center',alignItems:'center'},
  secH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:24,marginTop:24,marginBottom:12},
  secT:{fontSize:17,fontWeight:'700',color:Colors.text.primary},
  seeAll:{fontSize:13,fontWeight:'500',color:Colors.primary.teal},
  upCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',marginHorizontal:16,marginBottom:12,borderRadius:16,padding:16,...Shadow.sm},
  upIc:{width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center'},
  upInfo:{flex:1,marginLeft:12},
  upT:{fontSize:15,fontWeight:'600',color:Colors.text.primary},
  upD:{fontSize:13,color:Colors.text.secondary,marginTop:2},
  upTime:{fontSize:13,fontWeight:'600',color:Colors.text.primary},
  upRel:{fontSize:11,color:Colors.primary.teal,marginTop:2},
  quickRow:{flexDirection:'row',paddingHorizontal:16,gap:10,marginBottom:8},
  quickCard:{flex:1,backgroundColor:'#FFF',borderRadius:16,padding:14,alignItems:'center',...Shadow.sm},
  quickIc:{width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center',marginBottom:8},
  quickLabel:{fontSize:12,fontWeight:'600',color:Colors.text.primary},
  mileCard:{width:140,backgroundColor:'#FFF',borderRadius:16,padding:16,alignItems:'center',...Shadow.sm,borderWidth:1.5,borderColor:Colors.border.light},
  mileCardDone:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.03)'},
  mileTitle:{fontSize:13,fontWeight:'700',color:Colors.text.primary,marginTop:8,textAlign:'center'},
  mileDesc:{fontSize:11,color:Colors.text.secondary,marginTop:2,textAlign:'center'},
  mileBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:8,marginTop:8},
  mileBadgeText:{fontSize:11,fontWeight:'600',color:Colors.text.secondary},
  resCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',marginHorizontal:16,marginBottom:12,borderRadius:16,padding:16,...Shadow.sm},
  resIcon:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(26,158,143,0.1)',justifyContent:'center',alignItems:'center',marginRight:12},
  resTitle:{fontSize:15,fontWeight:'600',color:Colors.text.primary},
  resDesc:{fontSize:13,color:Colors.text.secondary,marginTop:2},
  tipCard:{flexDirection:'row',backgroundColor:'#FFF',marginHorizontal:16,borderRadius:16,padding:16,gap:14,...Shadow.sm,marginBottom:4},
  tipEmoji:{width:52,height:52,borderRadius:26,justifyContent:'center',alignItems:'center'},
  tipTitle:{fontSize:15,fontWeight:'700',marginBottom:4},
  tipText:{fontSize:13,color:Colors.text.secondary,lineHeight:18},
  tipDay:{fontSize:11,color:Colors.neutral.mediumGray,marginTop:6,fontWeight:'500'},
});
