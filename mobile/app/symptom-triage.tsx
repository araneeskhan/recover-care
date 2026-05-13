import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Shadow } from '../constants/Colors';

const { width: SW } = Dimensions.get('window');

// ─── Symptom Categories ──────────────────────────────────────────────────────

const SYMPTOM_GROUPS = [
  {
    category: 'Wound & Surgical Site',
    icon: 'bandage',
    color: '#E74C3C',
    symptoms: ['Wound Redness', 'Swelling at Incision', 'Discharge/Pus', 'Wound Reopening', 'Bruising'],
  },
  {
    category: 'Pain',
    icon: 'flash',
    color: '#E67E22',
    symptoms: ['Mild Pain', 'Moderate Pain', 'Severe Pain', 'Sudden Pain Spike', 'Pain at Rest'],
  },
  {
    category: 'Fever & Infection',
    icon: 'thermometer',
    color: '#F39C12',
    symptoms: ['Low-Grade Fever', 'High Fever (>38.5°C)', 'Chills', 'Night Sweats'],
  },
  {
    category: 'Respiratory',
    icon: 'medical',
    color: '#3498DB',
    symptoms: ['Shortness of Breath', 'Chest Pain', 'Rapid Breathing', 'Coughing'],
  },
  {
    category: 'Gastrointestinal',
    icon: 'nutrition',
    color: '#27AE60',
    symptoms: ['Nausea', 'Vomiting', 'Cannot Eat', 'Constipation', 'Diarrhea'],
  },
  {
    category: 'General',
    icon: 'body',
    color: '#9B59B6',
    symptoms: ['Extreme Fatigue', 'Dizziness', 'Confusion', 'Swollen Leg/Arm'],
  },
];

// ─── Follow-up Question Engine ────────────────────────────────────────────────

type Question = { id: string; text: string; options: { label: string; value: string; flag?: 'critical' | 'high' | 'medium' }[] };

function deriveQuestions(selected: string[]): Question[] {
  const qs: Question[] = [];

  if (selected.some(s => ['Wound Redness', 'Swelling at Incision', 'Discharge/Pus', 'Wound Reopening'].includes(s))) {
    qs.push({
      id: 'wound_duration',
      text: 'How long have you noticed changes at the wound site?',
      options: [
        { label: 'Just noticed (< 6 hours)', value: 'new' },
        { label: '6–24 hours', value: '6to24h', flag: 'medium' },
        { label: '1–2 days', value: '1to2d', flag: 'high' },
        { label: 'More than 2 days', value: 'over2d', flag: 'critical' },
      ],
    });
  }
  if (selected.includes('Discharge/Pus')) {
    qs.push({
      id: 'discharge_type',
      text: 'What does the discharge look like?',
      options: [
        { label: 'Clear or light yellow', value: 'clear' },
        { label: 'White/creamy', value: 'white', flag: 'medium' },
        { label: 'Green or yellow (thick)', value: 'pus', flag: 'critical' },
        { label: 'Blood-tinged', value: 'bloody', flag: 'high' },
      ],
    });
  }
  if (selected.includes('High Fever (>38.5°C)') || selected.includes('Low-Grade Fever')) {
    qs.push({
      id: 'fever_duration',
      text: 'How long have you had a fever?',
      options: [
        { label: 'Started within the last few hours', value: 'new' },
        { label: 'Since yesterday (12–24 hours)', value: '12to24h', flag: 'high' },
        { label: 'More than 24 hours', value: 'over24h', flag: 'critical' },
      ],
    });
  }
  if (selected.includes('Severe Pain') || selected.includes('Sudden Pain Spike')) {
    qs.push({
      id: 'pain_onset',
      text: 'How did the pain start?',
      options: [
        { label: 'Gradually worsening', value: 'gradual', flag: 'medium' },
        { label: 'Suddenly, within the past hour', value: 'sudden', flag: 'high' },
        { label: 'Came on extremely fast (minutes)', value: 'acute', flag: 'critical' },
      ],
    });
  }
  if (selected.includes('Shortness of Breath') || selected.includes('Chest Pain')) {
    qs.push({
      id: 'breathing',
      text: 'Are you having difficulty breathing?',
      options: [
        { label: 'Mild, only with exertion', value: 'mild' },
        { label: 'Noticeable at rest', value: 'moderate', flag: 'high' },
        { label: 'Severe — hard to breathe now', value: 'severe', flag: 'critical' },
      ],
    });
  }
  if (selected.includes('Swollen Leg/Arm')) {
    qs.push({
      id: 'swelling_onset',
      text: 'Describe the swelling:',
      options: [
        { label: 'Mild puffiness, both sides', value: 'bilateral' },
        { label: 'One limb only, tender', value: 'unilateral', flag: 'high' },
        { label: 'One limb, red and warm', value: 'dvt_risk', flag: 'critical' },
      ],
    });
  }
  if (selected.includes('Confusion')) {
    qs.push({
      id: 'confusion_level',
      text: 'How severe is the confusion?',
      options: [
        { label: 'Mild — just a bit foggy', value: 'mild', flag: 'medium' },
        { label: 'Moderate — trouble with simple things', value: 'moderate', flag: 'high' },
        { label: 'Severe — disoriented, can\'t recognize surroundings', value: 'severe', flag: 'critical' },
      ],
    });
  }

  // Medication question if multiple GI symptoms
  const giCount = selected.filter(s => ['Nausea', 'Vomiting', 'Cannot Eat', 'Diarrhea'].includes(s)).length;
  if (giCount >= 2) {
    qs.push({
      id: 'gi_cause',
      text: 'When did digestive symptoms start relative to medication?',
      options: [
        { label: 'Shortly after taking medication', value: 'med_related' },
        { label: 'Not related to medication', value: 'not_med', flag: 'medium' },
        { label: 'I haven\'t been able to keep meds down', value: 'cannot_take_meds', flag: 'high' },
      ],
    });
  }

  return qs;
}

// ─── Risk Assessment Engine ───────────────────────────────────────────────────

type RiskLevel = 'EMERGENCY' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Assessment {
  level: RiskLevel;
  title: string;
  summary: string;
  actions: string[];
  watchFor: string[];
  timeframe: string;
  color: string;
  bgColor: string;
  icon: string;
}

function assess(selected: string[], answers: Record<string, string>): Assessment {
  const flags = new Set<string>();

  // Emergency symptoms — immediate 911
  const emergency = [
    selected.includes('Chest Pain') && selected.includes('Shortness of Breath'),
    answers.breathing === 'severe',
    answers.confusion_level === 'severe',
    selected.includes('Chest Pain') && selected.includes('Rapid Breathing'),
  ];
  if (emergency.some(Boolean)) {
    return {
      level: 'EMERGENCY',
      title: 'Call 911 Immediately',
      summary: 'Your symptoms suggest a possible life-threatening complication. Do not wait — seek emergency care now.',
      actions: ['Call 911 or have someone drive you to the ER', 'Do not drive yourself', 'Bring your medication list'],
      watchFor: [],
      timeframe: 'Act NOW — within minutes',
      color: '#E74C3C',
      bgColor: '#FADBD8',
      icon: 'call',
    };
  }

  // Collect answer-based flags
  Object.values(answers).forEach(v => {
    if (['pus', 'over2d', 'acute', 'dvt_risk', 'over24h'].includes(v)) flags.add('critical');
    if (['bloody', '1to2d', 'sudden', '12to24h', 'moderate', 'cannot_take_meds', 'unilateral'].includes(v)) flags.add('high');
    if (['white', '6to24h', 'gradual', 'not_med', 'mild'].includes(v)) flags.add('medium');
  });

  const criticalSymptoms = ['Discharge/Pus', 'Wound Reopening', 'High Fever (>38.5°C)', 'Swollen Leg/Arm', 'Confusion'];
  const highSymptoms = ['Wound Redness', 'Severe Pain', 'Sudden Pain Spike', 'Chills', 'Night Sweats', 'Shortness of Breath'];
  const medSymptoms = ['Swelling at Incision', 'Moderate Pain', 'Nausea', 'Vomiting', 'Low-Grade Fever', 'Dizziness', 'Cannot Eat'];

  const critCount = selected.filter(s => criticalSymptoms.includes(s)).length + (flags.has('critical') ? 2 : 0);
  const highCount  = selected.filter(s => highSymptoms.includes(s)).length  + (flags.has('high') ? 1 : 0);
  const medCount   = selected.filter(s => medSymptoms.includes(s)).length;

  if (critCount >= 2 || flags.has('critical')) {
    return {
      level: 'CRITICAL',
      title: 'Contact Care Team Now',
      summary: 'Signs suggest a post-surgical complication that requires urgent evaluation today.',
      actions: [
        'Message your care team immediately through the app',
        'If no response in 30 minutes, call the hospital directly',
        'Go to the ER if symptoms worsen',
      ],
      watchFor: ['Fever above 38.5°C', 'Increasing wound discharge', 'Worsening pain', 'Rapid heartbeat'],
      timeframe: 'Within the next 1–2 hours',
      color: '#E74C3C',
      bgColor: '#FADBD8',
      icon: 'warning',
    };
  }

  if (highCount >= 2 || (critCount >= 1 && highCount >= 1) || flags.has('high')) {
    return {
      level: 'HIGH',
      title: 'Reach Out Today',
      summary: 'Your symptom combination warrants a check-in with your care team today. Don\'t wait until tomorrow.',
      actions: [
        'Send a message to your nurse or doctor now',
        'Take photos of your wound if you notice any changes',
        'Avoid strenuous activity until evaluated',
      ],
      watchFor: ['Fever developing', 'Increased pain or swelling', 'New discharge', 'Redness spreading'],
      timeframe: 'Within 4–6 hours',
      color: '#E67E22',
      bgColor: '#FDEBD0',
      icon: 'alert-circle',
    };
  }

  if (medCount >= 2 || highCount >= 1 || flags.has('medium')) {
    return {
      level: 'MEDIUM',
      title: 'Monitor Closely',
      summary: 'Some symptoms are present but not immediately alarming. Monitor them and contact your team if they worsen.',
      actions: [
        'Complete your daily check-in with all current symptoms',
        'Rest and stay hydrated',
        'Track if symptoms improve or worsen over the next 12 hours',
      ],
      watchFor: ['Fever above 38°C', 'Pain that doesn\'t respond to medication', 'New or worsening swelling'],
      timeframe: 'Monitor for 12–24 hours',
      color: '#F2994A',
      bgColor: '#FEF3E2',
      icon: 'eye',
    };
  }

  return {
    level: 'LOW',
    title: 'You\'re Doing Well',
    summary: 'Your symptoms are mild and consistent with normal post-surgical recovery. Keep following your care plan.',
    actions: [
      'Complete today\'s daily check-in',
      'Take medications as scheduled',
      'Rest and stay well-hydrated',
    ],
    watchFor: ['Any new symptoms appearing', 'Fever above 38°C', 'Significant pain increase'],
    timeframe: 'Routine monitoring',
    color: '#27AE60',
    bgColor: '#D4EFDF',
    icon: 'checkmark-circle',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SymptomTriageScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'questions' | 'result'>('select');
  const [selected, setSelected] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Assessment | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggle = (symptom: string) => {
    setSelected(prev => prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]);
  };

  const goToQuestions = () => {
    const qs = deriveQuestions(selected);
    setQuestions(qs);
    setQIndex(0);
    setAnswers({});
    if (qs.length === 0) {
      setResult(assess(selected, {}));
      animateTo('result');
    } else {
      animateTo('questions');
    }
  };

  const answerQuestion = (q: Question, value: string) => {
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    if (qIndex < questions.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => setQIndex(qIndex + 1));
    } else {
      setResult(assess(selected, newAnswers));
      animateTo('result');
    }
  };

  const animateTo = (s: 'select' | 'questions' | 'result') => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const reset = () => {
    setSelected([]);
    setAnswers({});
    setResult(null);
    setQIndex(0);
    animateTo('select');
  };

  const LEVEL_GRAD: Record<RiskLevel, [string, string]> = {
    EMERGENCY: ['#C0392B', '#E74C3C'],
    CRITICAL:  ['#C0392B', '#E74C3C'],
    HIGH:      ['#D35400', '#E67E22'],
    MEDIUM:    ['#D68910', '#F2994A'],
    LOW:       ['#1E8449', '#27AE60'],
  };

  return (
    <View style={ts.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={ts.header}>
        <TouchableOpacity onPress={() => step === 'select' ? router.back() : reset()} style={ts.backBtn}>
          <Ionicons name={step === 'select' ? 'chevron-back' : 'refresh'} size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ts.title}>Symptom Triage</Text>
          <Text style={ts.subtitle}>
            {step === 'select' ? 'Select all symptoms you\'re experiencing' :
             step === 'questions' ? `Question ${qIndex + 1} of ${questions.length}` :
             'Your assessment is ready'}
          </Text>
        </View>
        {step === 'select' && selected.length > 0 && (
          <View style={ts.selectedBadge}>
            <Text style={ts.selectedBadgeText}>{selected.length}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Progress bar for questions */}
      {step === 'questions' && (
        <View style={ts.progressTrack}>
          <View style={[ts.progressFill, { width: `${((qIndex + 1) / questions.length) * 100}%` as any }]} />
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {step === 'select' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Live risk indicator */}
            {selected.length > 0 && (() => {
              const quick = assess(selected, {});
              return (
                <View style={[ts.liveBanner, { backgroundColor: quick.bgColor, borderLeftColor: quick.color }]}>
                  <Ionicons name={quick.icon as any} size={18} color={quick.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[ts.liveTitle, { color: quick.color }]}>Preliminary: {quick.level}</Text>
                    <Text style={ts.liveSub}>Answer follow-up questions for full assessment</Text>
                  </View>
                </View>
              );
            })()}

            {SYMPTOM_GROUPS.map(group => (
              <View key={group.category} style={ts.group}>
                <View style={ts.groupHeader}>
                  <View style={[ts.groupIcon, { backgroundColor: group.color + '20' }]}>
                    <Ionicons name={group.icon as any} size={16} color={group.color} />
                  </View>
                  <Text style={ts.groupTitle}>{group.category}</Text>
                </View>
                <View style={ts.chipGrid}>
                  {group.symptoms.map(s => {
                    const active = selected.includes(s);
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[ts.chip, active && { backgroundColor: group.color + '15', borderColor: group.color }]}
                        onPress={() => toggle(s)}
                        activeOpacity={0.75}
                      >
                        {active && <Ionicons name="checkmark-circle" size={14} color={group.color} />}
                        <Text style={[ts.chipText, active && { color: group.color, fontWeight: '600' }]}>{s}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {step === 'questions' && questions[qIndex] && (
          <View style={ts.qPane}>
            <View style={ts.qCard}>
              <View style={ts.qNumBadge}>
                <Text style={ts.qNumText}>Q{qIndex + 1}</Text>
              </View>
              <Text style={ts.qText}>{questions[qIndex].text}</Text>
              <View style={{ gap: 10, marginTop: 20 }}>
                {questions[qIndex].options.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[ts.optBtn, opt.flag === 'critical' && ts.optCritical, opt.flag === 'high' && ts.optHigh, opt.flag === 'medium' && ts.optMedium]}
                    onPress={() => answerQuestion(questions[qIndex], opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[ts.optText, opt.flag === 'critical' && { color: '#C0392B' }, opt.flag === 'high' && { color: '#D35400' }]}>
                      {opt.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={
                      opt.flag === 'critical' ? '#C0392B' : opt.flag === 'high' ? '#D35400' : Colors.text.tertiary
                    } />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={ts.qHint}>Your answers help us provide accurate guidance</Text>
          </View>
        )}

        {step === 'result' && result && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Result hero */}
            <LinearGradient colors={LEVEL_GRAD[result.level]} style={ts.resultHero}>
              <View style={ts.resultIconRing}>
                <Ionicons name={result.icon as any} size={40} color="#FFF" />
              </View>
              <View style={[ts.levelBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={ts.levelBadgeText}>{result.level} RISK</Text>
              </View>
              <Text style={ts.resultTitle}>{result.title}</Text>
              <Text style={ts.resultTimeframe}>{result.timeframe}</Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
              {/* Summary */}
              <View style={ts.resultCard}>
                <Text style={ts.resultCardTitle}>Assessment Summary</Text>
                <Text style={ts.resultSummary}>{result.summary}</Text>
              </View>

              {/* Actions */}
              <View style={ts.resultCard}>
                <Text style={ts.resultCardTitle}>Recommended Actions</Text>
                {result.actions.map((a, i) => (
                  <View key={i} style={ts.actionRow}>
                    <View style={[ts.actionNum, { backgroundColor: result.color + '20' }]}>
                      <Text style={[ts.actionNumText, { color: result.color }]}>{i + 1}</Text>
                    </View>
                    <Text style={ts.actionText}>{a}</Text>
                  </View>
                ))}
              </View>

              {/* Watch for */}
              {result.watchFor.length > 0 && (
                <View style={[ts.resultCard, { borderLeftWidth: 4, borderLeftColor: Colors.semantic.warning }]}>
                  <Text style={ts.resultCardTitle}>Watch For These Signs</Text>
                  {result.watchFor.map((w, i) => (
                    <View key={i} style={ts.watchRow}>
                      <Ionicons name="alert-circle-outline" size={14} color={Colors.semantic.warning} />
                      <Text style={ts.watchText}>{w}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Selected symptoms summary */}
              <View style={ts.resultCard}>
                <Text style={ts.resultCardTitle}>Symptoms Assessed ({selected.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {selected.map(s => (
                    <View key={s} style={[ts.symTag, { borderColor: result.color }]}>
                      <Text style={[ts.symTagText, { color: result.color }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* CTAs */}
              <TouchableOpacity style={[ts.ctaBtn, { backgroundColor: Colors.primary.navy }]}
                onPress={() => router.push('/(tabs)/checkin')}>
                <Ionicons name="clipboard" size={18} color="#FFF" />
                <Text style={ts.ctaBtnText}>Log in Daily Check-In</Text>
              </TouchableOpacity>
              {(result.level === 'CRITICAL' || result.level === 'HIGH') && (
                <TouchableOpacity style={[ts.ctaBtn, { backgroundColor: Colors.primary.teal }]}
                  onPress={() => router.push('/(tabs)/messages')}>
                  <Ionicons name="chatbubbles" size={18} color="#FFF" />
                  <Text style={ts.ctaBtnText}>Message Care Team</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[ts.ctaBtn, { backgroundColor: Colors.background.primary, borderWidth: 1.5, borderColor: Colors.border.medium }]}
                onPress={reset}>
                <Ionicons name="refresh" size={18} color={Colors.text.primary} />
                <Text style={[ts.ctaBtnText, { color: Colors.text.primary }]}>Run New Assessment</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Bottom CTA for selection step */}
      {step === 'select' && (
        <View style={ts.bottomBar}>
          {selected.length === 0 ? (
            <View style={[ts.nextBtn, { backgroundColor: Colors.border.medium }]}>
              <Text style={[ts.nextText, { color: Colors.text.tertiary }]}>Select at least one symptom</Text>
            </View>
          ) : (
            <TouchableOpacity style={ts.nextBtn} onPress={goToQuestions} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.background.tealGradientStart, Colors.background.tealGradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ts.nextBtnGrad}>
                <Text style={ts.nextText}>Assess {selected.length} symptom{selected.length !== 1 ? 's' : ''}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const ts = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  selectedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary.teal, justifyContent: 'center', alignItems: 'center' },
  selectedBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 3, backgroundColor: Colors.border.light },
  progressFill: { height: 3, backgroundColor: Colors.primary.teal },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 4, borderRadius: 12, padding: 14, borderLeftWidth: 4 },
  liveTitle: { fontSize: 14, fontWeight: '700' },
  liveSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  group: { paddingHorizontal: 16, paddingTop: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  groupIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  groupTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: Colors.border.light, ...Shadow.sm },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.text.primary },
  qPane: { flex: 1, padding: 20, justifyContent: 'center' },
  qCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, ...Shadow.md },
  qNumBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary.navy, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  qNumText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  qText: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, lineHeight: 26 },
  optBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background.primary, borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: Colors.border.light },
  optCritical: { backgroundColor: '#FADBD8', borderColor: '#E74C3C' },
  optHigh: { backgroundColor: '#FDEBD0', borderColor: '#E67E22' },
  optMedium: { backgroundColor: '#FEF9C3', borderColor: '#F39C12' },
  optText: { fontSize: 14, fontWeight: '500', color: Colors.text.primary, flex: 1 },
  qHint: { fontSize: 12, color: Colors.text.tertiary, textAlign: 'center', marginTop: 16 },
  resultHero: { padding: 32, alignItems: 'center', gap: 10 },
  resultIconRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  levelBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  levelBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  resultTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  resultTimeframe: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, ...Shadow.sm },
  resultCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  resultSummary: { fontSize: 15, color: Colors.text.secondary, lineHeight: 22 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 },
  actionNum: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  actionNumText: { fontSize: 13, fontWeight: '800' },
  actionText: { flex: 1, fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  watchText: { fontSize: 14, color: Colors.text.secondary, flex: 1, lineHeight: 19 },
  symTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  symTagText: { fontSize: 12, fontWeight: '600' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, backgroundColor: Colors.background.primary, borderTopWidth: 1, borderTopColor: Colors.border.light },
  nextBtn: { borderRadius: 16, overflow: 'hidden', ...Shadow.md },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  nextText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
