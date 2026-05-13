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
  const pct = Math.round((currentDay / totalDays) * 100);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={Colors.primary.teal} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - currentDay/totalDays)} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>DAY</Text>
        <Text style={{ color: '#FFF', fontSize: 34, fontWeight: '800', lineHeight: 38 }}>{currentDay}</Text>
        <Text style={{ color: Colors.primary.tealLight, fontSize: 10, fontWeight: '600' }}>{pct}%</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.secH}>
      <View style={s.secLeft}>
        <View style={s.secAccent} />
        <Text style={s.secT}>{title}</Text>
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}><Text style={s.seeAll}>{action}</Text></TouchableOpacity>
      )}
    </View>
  );
}

const DEMO = {
  patient: { firstName: 'Sarah' },
  recovery: { currentDay: 11, totalDays: 14, daysRemaining: 3, isOnTrack: true },
  vitals: { painLevel: 3, temperature: 36.9, lastCheckInTime: new Date(Date.now() - 7 * 86400000).toISOString() },
  hasCheckedInToday: false,
  medications: [{ id: '1', name: 'Amoxicillin', dosage: '500mg', nextDoseAt: new Date(new Date().setHours(14,0,0,0)).toISOString() }],
  appointments: [{ id: '1', title: 'Call with Dr. Patel', description: 'Post-op review · 15 min', dateTime: new Date(Date.now() + 3*86400000).toISOString() }],
  unreadMessages: 2,
};

const QUICK_ACTIONS = [
  { label: 'Trends', icon: 'analytics', bg: 'rgba(26,158,143,0.12)', color: Colors.primary.teal, route: '/history' },
  { label: 'Appointments', icon: 'calendar', bg: Colors.semantic.infoLight, color: Colors.semantic.info, route: '/appointments' },
  { label: 'Medications', icon: 'medical', bg: Colors.semantic.warningLight, color: Colors.semantic.warning, route: '/medications' },
  { label: 'SOS', icon: 'alert-circle', bg: Colors.semantic.errorLight, color: Colors.semantic.error, sos: true },
  { label: 'Wound Log', icon: 'bandage', bg: 'rgba(142,68,173,0.1)', color: '#8E44AD', route: '/wound-journal' },
  { label: 'Report', icon: 'document-text', bg: 'rgba(52,152,219,0.1)', color: '#3498DB', route: '/health-report' },
  { label: 'Symptoms', icon: 'book', bg: 'rgba(39,174,96,0.1)', color: '#27AE60', route: '/symptom-glossary' },
  { label: 'Resources', icon: 'library', bg: 'rgba(26,158,143,0.06)', color: Colors.primary.teal, route: '/resources' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try { const r = await patientAPI.getDashboard(); setD(r.data); }
    catch { setD(DEMO); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
  const fmtDate = (s: string) => { const dt=new Date(s); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]} ${fmtTime(s)}`; };
  const relTime = (s: string) => { const h=Math.floor((new Date(s).getTime()-Date.now())/3600000); const dy=Math.floor(h/24); return dy>0?`in ${dy} day${dy>1?'s':''}`:h>0?`in ${h}h`:'soon'; };

  const painColor = (level: number) => level <= 3 ? Colors.semantic.success : level <= 6 ? Colors.semantic.warning : Colors.semantic.error;

  if (!d) return (
    <View style={[s.container, {justifyContent:'center', alignItems:'center'}]}>
      <Ionicons name="pulse" size={32} color={Colors.primary.teal} />
      <Text style={{color:Colors.neutral.mediumGray, marginTop:12, fontSize:15}}>Loading your dashboard…</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal}/>}>

      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={s.header}>
        <View style={s.greetRow}>
          <View style={{flex:1}}>
            <Text style={s.dateText}>{days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}</Text>
            <Text style={s.greetText}>{greeting},{'\n'}<Text style={{color:Colors.primary.tealLight}}>{d.patient?.firstName||user?.firstName||'Patient'}</Text></Text>
          </View>
          <TouchableOpacity style={s.bell} onPress={()=>router.push('/alerts')}>
            <Ionicons name="notifications" size={22} color="#FFF"/>
            {d.unreadMessages>0&&<View style={s.bellDot}/>}
          </TouchableOpacity>
        </View>

        <View style={s.recoverySec}>
          <RecoveryRing currentDay={d.recovery.currentDay} totalDays={d.recovery.totalDays}/>
          <View style={{flex:1}}>
            <Text style={s.recLabel}>RECOVERY PROGRESS</Text>
            <Text style={s.recTitle}>Day {d.recovery.currentDay} of {d.recovery.totalDays}</Text>
            <Text style={s.recSub}>{d.recovery.daysRemaining} days until clearance</Text>
            <View style={s.recStatusRow}>
              <View style={[s.recStatusDot, {backgroundColor: d.recovery.isOnTrack ? Colors.semantic.success : Colors.semantic.warning}]} />
              <Text style={[s.recStatus, {color: d.recovery.isOnTrack ? Colors.semantic.success : Colors.semantic.warning}]}>
                {d.recovery.isOnTrack ? 'Healing on track' : 'Needs attention'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Vitals */}
      <View style={s.vitals}>
        <View style={s.vi}>
          <View style={s.viRow}><Ionicons name="water" size={13} color={painColor(d.vitals?.painLevel??0)}/><Text style={s.viL}>PAIN</Text></View>
          <Text style={[s.viV, {color: painColor(d.vitals?.painLevel??0)}]}>{d.vitals?.painLevel??'-'}<Text style={s.viU}>/10</Text></Text>
          <View style={[s.viBar, {backgroundColor: painColor(d.vitals?.painLevel??0)}]} />
        </View>
        <View style={[s.vi, s.viB]}>
          <View style={s.viRow}><Ionicons name="thermometer" size={13} color={Colors.semantic.info}/><Text style={s.viL}>TEMP</Text></View>
          <Text style={[s.viV, {color: Colors.semantic.info}]}>{d.vitals?.temperature?.toFixed(1)??'-'}<Text style={s.viU}>°C</Text></Text>
          <View style={[s.viBar, {backgroundColor: Colors.semantic.info}]} />
        </View>
        <View style={s.vi}>
          <View style={s.viRow}><Ionicons name="time" size={13} color={Colors.primary.teal}/><Text style={s.viL}>LAST CHECK</Text></View>
          <Text style={[s.viV, {fontSize:13, color: Colors.text.primary}]}>{d.vitals?.lastCheckInTime ? fmtTime(d.vitals.lastCheckInTime).toLowerCase() : '-'}</Text>
          <View style={[s.viBar, {backgroundColor: Colors.primary.teal}]} />
        </View>
      </View>

      {/* CTA */}
      {!d.hasCheckedInToday && (
        <TouchableOpacity style={s.cta} onPress={()=>router.push('/(tabs)/checkin')} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.background.tealGradientStart, Colors.background.tealGradientEnd]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.ctaG}>
            <View style={{flex:1}}>
              <Text style={s.ctaL}>TODAY'S TASK</Text>
              <Text style={s.ctaT}>Complete today's{'\n'}check-in</Text>
              <Text style={s.ctaS}>Takes about 2 minutes</Text>
            </View>
            <View style={s.ctaArr}>
              <Ionicons name="arrow-forward" size={22} color={Colors.primary.teal}/>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <View style={s.quickGrid}>
        {QUICK_ACTIONS.map((qa, i) => (
          <TouchableOpacity key={i} style={s.quickCard}
            onPress={() => {
              if (qa.sos) {
                Alert.alert('🚨 Emergency SOS','This will call emergency services. Are you sure?',[
                  {text:'Cancel',style:'cancel'},{text:'Call 911',style:'destructive',onPress:()=>Linking.openURL('tel:911')}
                ]);
              } else if (qa.route) {
                router.push(qa.route as any);
              }
            }}
            activeOpacity={0.75}>
            <View style={[s.quickIc, {backgroundColor: qa.bg}]}>
              <Ionicons name={qa.icon as any} size={24} color={qa.color}/>
            </View>
            <Text style={s.quickLabel}>{qa.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily Recovery Tip */}
      <SectionHeader title="Today's Recovery Tip" />
      {(() => {
        const day = d.recovery?.currentDay || 1;
        const tips = [
          { day:1, emoji:'🛌', title:'Rest Is Recovery', text:'Your body does its best healing while you rest. Aim for 8–10 hours of sleep tonight.', color:'#8E44AD' },
          { day:2, emoji:'🚶', title:'Start Moving Gently', text:'Take a short 5-minute walk every few hours. Movement prevents blood clots and aids healing.', color:'#3498DB' },
          { day:3, emoji:'💧', title:'Stay Hydrated', text:'Drink 8+ glasses of water today. Proper hydration supports wound healing and medication absorption.', color:'#1A9E8F' },
          { day:4, emoji:'🍎', title:'Fuel Your Recovery', text:'Focus on protein-rich foods (eggs, fish, beans) to support tissue repair. Avoid processed foods.', color:'#27AE60' },
          { day:5, emoji:'📸', title:'Document Your Healing', text:'Take a photo of your incision to track progress. Compare with yesterday — healing takes time!', color:'#F2994A' },
          { day:6, emoji:'🧘', title:'Mind-Body Connection', text:'Try 5 minutes of deep breathing. Stress hormones can slow wound healing.', color:'#8E44AD' },
          { day:7, emoji:'🎉', title:'One Week Milestone!', text:"You made it through the first week! Your incision should be less tender now. Keep up the great work.", color:'#E74C3C' },
          { day:8, emoji:'🏃', title:'Increase Activity', text:'Try walking for 15 minutes today. Gradually increase duration but avoid heavy lifting.', color:'#3498DB' },
          { day:9, emoji:'💊', title:'Medication Check', text:'Review your medication schedule. Some meds may be tapering off — consult your care team.', color:'#F2994A' },
          { day:10, emoji:'🩹', title:'Wound Care Reminder', text:"Keep your incision clean and dry. It's normal for it to itch as it heals — don't scratch!", color:'#E74C3C' },
          { day:11, emoji:'😊', title:'Emotional Check-In', text:'Feeling frustrated or down is normal during recovery. Talk to someone if you need support.', color:'#8E44AD' },
          { day:12, emoji:'🥗', title:'Anti-Inflammatory Foods', text:'Add berries, leafy greens, and fatty fish to your diet to reduce inflammation naturally.', color:'#27AE60' },
          { day:13, emoji:'🔔', title:'Prepare for Follow-Up', text:'Your follow-up appointment is coming. Write down any questions for your doctor.', color:'#3498DB' },
          { day:14, emoji:'🏆', title:'Recovery Complete!', text:'Congratulations on completing your recovery period! Continue following care instructions.', color:'#1A9E8F' },
        ];
        const tip = tips[Math.min(day - 1, tips.length - 1)];
        return (
          <View style={[s.tipCard, {borderLeftColor: tip.color}]}>
            <View style={[s.tipEmoji, {backgroundColor: tip.color + '18'}]}>
              <Text style={{fontSize:26}}>{tip.emoji}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={[s.tipTitle, {color: tip.color}]}>{tip.title}</Text>
              <Text style={s.tipText}>{tip.text}</Text>
              <Text style={s.tipDay}>Day {day} · Recovery Tip</Text>
            </View>
          </View>
        );
      })()}

      {/* Upcoming */}
      <SectionHeader title="Upcoming" action="See all" onAction={()=>router.push('/appointments')} />

      {d.medications?.filter((m:any)=>m.nextDoseAt)?.slice(0,1).map((m:any)=>(
        <TouchableOpacity key={m.id} style={s.upCard} onPress={()=>router.push('/medications')} activeOpacity={0.7}>
          <View style={[s.upIc, {backgroundColor:Colors.semantic.warningLight}]}>
            <Ionicons name="medical" size={20} color={Colors.semantic.warning}/>
          </View>
          <View style={s.upInfo}>
            <Text style={s.upT}>Take {m.name}</Text>
            <Text style={s.upD}>{m.dosage} · with food</Text>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text style={s.upTime}>{fmtTime(m.nextDoseAt)}</Text>
            <Text style={s.upRel}>{relTime(m.nextDoseAt)}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {d.appointments?.slice(0,1).map((a:any)=>(
        <TouchableOpacity key={a.id} style={s.upCard} onPress={()=>router.push('/appointments')} activeOpacity={0.7}>
          <View style={[s.upIc, {backgroundColor:Colors.semantic.infoLight}]}>
            <Ionicons name="call" size={20} color={Colors.semantic.info}/>
          </View>
          <View style={s.upInfo}>
            <Text style={s.upT}>{a.title}</Text>
            <Text style={s.upD}>{a.description}</Text>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text style={s.upTime}>{fmtDate(a.dateTime)}</Text>
            <Text style={s.upRel}>{relTime(a.dateTime)}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Milestones */}
      <SectionHeader title="Recovery Milestones" />
      {(() => {
        const day = d.recovery?.currentDay || 1;
        const total = d.recovery?.totalDays || 14;
        const milestones = [
          { day:1, title:'Surgery\nComplete', emoji:'🏥', done: day >= 1 },
          { day:3, title:'First\n72 Hours', emoji:'💪', done: day >= 3 },
          { day:7, title:'One\nWeek', emoji:'🌟', done: day >= 7 },
          { day:10, title:'Almost\nThere', emoji:'🎯', done: day >= 10 },
          { day:total, title:'Full\nRecovery', emoji:'🎉', done: day >= total },
        ];
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16, gap:10, paddingBottom:4}}>
            {milestones.map((m, i) => (
              <View key={i} style={[s.mileCard, m.done && s.mileCardDone]}>
                {m.done && (
                  <View style={s.mileCheck}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
                <Text style={{fontSize:26}}>{m.emoji}</Text>
                <Text style={[s.mileTitle, m.done && {color:Colors.primary.teal}]}>{m.title}</Text>
                <View style={[s.mileBadge, m.done ? {backgroundColor:Colors.semantic.successLight} : {backgroundColor:Colors.background.primary}]}>
                  <Text style={[s.mileBadgeText, m.done && {color:Colors.semantic.success}]}>
                    {m.done ? 'Done' : `Day ${m.day}`}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        );
      })()}

      <View style={{height:32}}/>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.background.primary},
  header:{paddingTop:60,paddingHorizontal:24,paddingBottom:36,borderBottomLeftRadius:28,borderBottomRightRadius:28},
  greetRow:{flexDirection:'row',alignItems:'flex-start',marginBottom:24,gap:12},
  dateText:{color:'rgba(255,255,255,0.55)',fontSize:13,marginBottom:4,fontWeight:'500'},
  greetText:{color:'#FFF',fontSize:26,fontWeight:'700',lineHeight:34},
  bell:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,0.12)',justifyContent:'center',alignItems:'center'},
  bellDot:{position:'absolute',top:10,right:12,width:8,height:8,borderRadius:4,backgroundColor:Colors.semantic.error,borderWidth:2,borderColor:Colors.primary.navy},
  recoverySec:{flexDirection:'row',alignItems:'center',gap:20},
  recLabel:{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:'700',letterSpacing:1.2,marginBottom:4},
  recTitle:{color:'#FFF',fontSize:19,fontWeight:'700'},
  recSub:{color:'rgba(255,255,255,0.55)',fontSize:13,marginTop:2},
  recStatusRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},
  recStatusDot:{width:7,height:7,borderRadius:4},
  recStatus:{fontSize:13,fontWeight:'600'},
  vitals:{flexDirection:'row',backgroundColor:'#FFF',marginHorizontal:16,marginTop:-22,borderRadius:18,paddingTop:18,paddingBottom:14,...Shadow.md},
  vi:{flex:1,alignItems:'center',paddingHorizontal:6},
  viB:{borderLeftWidth:1,borderRightWidth:1,borderColor:Colors.border.light},
  viRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:6},
  viL:{fontSize:10,fontWeight:'700',color:Colors.neutral.mediumGray,letterSpacing:0.8},
  viV:{fontSize:20,fontWeight:'800',color:Colors.text.primary,marginBottom:8},
  viU:{fontSize:12,fontWeight:'400',color:Colors.neutral.mediumGray},
  viBar:{height:3,width:32,borderRadius:2,marginTop:2},
  cta:{marginHorizontal:16,marginTop:20,borderRadius:20,overflow:'hidden',...Shadow.lg},
  ctaG:{flexDirection:'row',alignItems:'center',paddingVertical:22,paddingHorizontal:22,gap:12},
  ctaL:{color:'rgba(255,255,255,0.75)',fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:4},
  ctaT:{color:'#FFF',fontSize:20,fontWeight:'800',lineHeight:26},
  ctaS:{color:'rgba(255,255,255,0.7)',fontSize:13,marginTop:4},
  ctaArr:{width:48,height:48,borderRadius:24,backgroundColor:'#FFF',justifyContent:'center',alignItems:'center',...Shadow.sm},
  secH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,marginTop:26,marginBottom:14},
  secLeft:{flexDirection:'row',alignItems:'center',gap:8},
  secAccent:{width:3,height:18,borderRadius:2,backgroundColor:Colors.primary.teal},
  secT:{fontSize:16,fontWeight:'700',color:Colors.text.primary},
  seeAll:{fontSize:13,fontWeight:'600',color:Colors.primary.teal},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:16,gap:10},
  quickCard:{width:'22%',flexGrow:1,backgroundColor:'#FFF',borderRadius:16,padding:14,alignItems:'center',...Shadow.sm},
  quickIc:{width:48,height:48,borderRadius:14,justifyContent:'center',alignItems:'center',marginBottom:8},
  quickLabel:{fontSize:12,fontWeight:'600',color:Colors.text.primary,textAlign:'center'},
  upCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',marginHorizontal:16,marginBottom:10,borderRadius:16,padding:16,...Shadow.sm},
  upIc:{width:44,height:44,borderRadius:14,justifyContent:'center',alignItems:'center'},
  upInfo:{flex:1,marginLeft:12},
  upT:{fontSize:15,fontWeight:'600',color:Colors.text.primary},
  upD:{fontSize:13,color:Colors.text.secondary,marginTop:2},
  upTime:{fontSize:13,fontWeight:'600',color:Colors.text.primary,textAlign:'right'},
  upRel:{fontSize:11,color:Colors.primary.teal,marginTop:2,fontWeight:'600'},
  tipCard:{flexDirection:'row',backgroundColor:'#FFF',marginHorizontal:16,borderRadius:16,padding:16,gap:14,...Shadow.sm,borderLeftWidth:4,borderLeftColor:Colors.primary.teal},
  tipEmoji:{width:52,height:52,borderRadius:26,justifyContent:'center',alignItems:'center'},
  tipTitle:{fontSize:15,fontWeight:'700',marginBottom:4},
  tipText:{fontSize:13,color:Colors.text.secondary,lineHeight:19},
  tipDay:{fontSize:11,color:Colors.neutral.mediumGray,marginTop:6,fontWeight:'600'},
  mileCard:{width:120,backgroundColor:'#FFF',borderRadius:16,padding:14,alignItems:'center',...Shadow.sm,borderWidth:1.5,borderColor:Colors.border.light},
  mileCardDone:{borderColor:Colors.primary.teal,backgroundColor:'rgba(26,158,143,0.04)'},
  mileCheck:{position:'absolute',top:10,right:10,width:18,height:18,borderRadius:9,backgroundColor:Colors.primary.teal,justifyContent:'center',alignItems:'center'},
  mileTitle:{fontSize:12,fontWeight:'700',color:Colors.text.primary,marginTop:8,textAlign:'center',lineHeight:17},
  mileBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:8,marginTop:8},
  mileBadgeText:{fontSize:11,fontWeight:'600',color:Colors.text.secondary},
});
