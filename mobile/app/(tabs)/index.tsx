import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
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
          <TouchableOpacity style={s.bell}>
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

      <View style={s.secH}><Text style={s.secT}>Upcoming</Text><TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity></View>

      {d.medications?.filter((m:any)=>m.nextDoseAt)?.slice(0,1).map((m:any)=>(
        <TouchableOpacity key={m.id} style={s.upCard} onPress={()=>router.push('/medications')} activeOpacity={0.7}>
          <View style={[s.upIc,{backgroundColor:Colors.semantic.warningLight}]}><Ionicons name="medical" size={20} color={Colors.semantic.warning}/></View>
          <View style={s.upInfo}><Text style={s.upT}>Take {m.name}</Text><Text style={s.upD}>{m.dosage} · with food</Text></View>
          <View style={{alignItems:'flex-end'}}><Text style={s.upTime}>{fmtTime(m.nextDoseAt)}</Text><Text style={s.upRel}>{relTime(m.nextDoseAt)}</Text></View>
        </TouchableOpacity>))}

      {d.appointments?.slice(0,1).map((a:any)=>(
        <TouchableOpacity key={a.id} style={s.upCard} activeOpacity={0.7}>
          <View style={[s.upIc,{backgroundColor:Colors.semantic.infoLight}]}><Ionicons name="call" size={20} color={Colors.semantic.info}/></View>
          <View style={s.upInfo}><Text style={s.upT}>{a.title}</Text><Text style={s.upD}>{a.description}</Text></View>
          <View style={{alignItems:'flex-end'}}><Text style={s.upTime}>{fmtDate(a.dateTime)}</Text><Text style={s.upRel}>{relTime(a.dateTime)}</Text></View>
        </TouchableOpacity>))}
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
});
