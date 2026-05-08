import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadow } from '../constants/Colors';

const CATEGORIES = [
  { id: 'wound', label: 'Wound Care', icon: 'bandage', color: Colors.semantic.error, bg: Colors.semantic.errorLight },
  { id: 'activity', label: 'Activity', icon: 'walk', color: Colors.primary.teal, bg: 'rgba(26,158,143,0.12)' },
  { id: 'diet', label: 'Diet', icon: 'nutrition', color: Colors.semantic.warning, bg: Colors.semantic.warningLight },
  { id: 'meds', label: 'Medications', icon: 'medical', color: Colors.semantic.info, bg: Colors.semantic.infoLight },
  { id: 'warning', label: 'Warning Signs', icon: 'alert-circle', color: '#E74C3C', bg: '#FADBD8' },
  { id: 'faq', label: 'FAQ', icon: 'help-circle', color: Colors.primary.navy, bg: 'rgba(11,31,63,0.08)' },
];

const CONTENT: Record<string, { title: string; items: { heading: string; body: string; icon?: string }[] }> = {
  wound: {
    title: 'Wound Care Instructions',
    items: [
      { heading: 'Keep the incision clean and dry', body: 'Gently wash the incision area with mild soap and water once daily. Pat dry with a clean towel. Do not soak in a bath, pool, or hot tub for at least 2 weeks.', icon: 'water' },
      { heading: 'Dressing changes', body: 'Change your surgical dressings every 24 hours or as directed. Wash your hands thoroughly before and after each dressing change. Use sterile gauze and medical tape.', icon: 'bandage' },
      { heading: 'Watch for signs of infection', body: 'Contact your care team immediately if you notice: increasing redness, swelling, warmth around the incision, pus or cloudy drainage, fever above 38.5°C (101.3°F), or red streaks near the wound.', icon: 'alert-circle' },
      { heading: 'Steri-Strips', body: 'If you have Steri-Strips (small white adhesive strips), leave them in place. They will fall off on their own within 7-10 days. Do not pull them off.', icon: 'remove-circle' },
    ],
  },
  activity: {
    title: 'Activity Guidelines',
    items: [
      { heading: 'Walking is encouraged', body: 'Start with short walks (5-10 minutes) several times a day. Gradually increase distance and duration as you feel comfortable. Walking helps prevent blood clots and promotes healing.', icon: 'walk' },
      { heading: 'Avoid heavy lifting', body: 'Do not lift anything heavier than 10 pounds (about a gallon of milk) for at least 4-6 weeks after surgery, or as directed by your surgeon.', icon: 'fitness' },
      { heading: 'Stair climbing', body: 'You may go up and down stairs carefully. Take one step at a time and use the handrail for support. Rest when needed.', icon: 'trending-up' },
      { heading: 'Driving restrictions', body: 'Do not drive for at least 1-2 weeks after surgery, or while taking prescription pain medications. Your surgeon will clear you to drive at your follow-up appointment.', icon: 'car' },
      { heading: 'Return to work', body: 'Most patients can return to sedentary work in 1-2 weeks. Physical or demanding jobs may require 4-6 weeks off. Discuss your specific situation with your surgeon.', icon: 'briefcase' },
    ],
  },
  diet: {
    title: 'Dietary Guidelines',
    items: [
      { heading: 'Start with clear liquids', body: 'For the first 24 hours after surgery, stick to clear liquids: water, broth, apple juice, gelatin, and ice pops. This helps prevent nausea from anesthesia.', icon: 'water' },
      { heading: 'Progress to soft foods', body: 'After 24 hours, gradually introduce soft, bland foods: toast, crackers, yogurt, applesauce, bananas, and rice. Avoid greasy, spicy, or heavy foods for the first week.', icon: 'restaurant' },
      { heading: 'Stay hydrated', body: 'Drink at least 8 glasses of water per day. Adequate hydration supports wound healing and prevents constipation from pain medications.', icon: 'cafe' },
      { heading: 'High-fiber foods', body: 'Pain medications can cause constipation. Include high-fiber foods like whole grains, fruits, vegetables, and consider a stool softener if needed.', icon: 'leaf' },
      { heading: 'Avoid alcohol', body: 'Do not consume alcohol while taking pain medications. Wait at least 48 hours after your last dose before drinking. Alcohol can also impair wound healing.', icon: 'wine' },
    ],
  },
  meds: {
    title: 'Medication Instructions',
    items: [
      { heading: 'Take medications as prescribed', body: 'Follow the exact dosage and timing prescribed by your doctor. Do not skip doses, even if you feel better. Complete the full course of antibiotics.', icon: 'medical' },
      { heading: 'Pain management', body: 'Take pain medication before pain becomes severe. It is easier to prevent pain than to treat it. Use prescribed medication for the first 48-72 hours, then transition to over-the-counter options.', icon: 'pulse' },
      { heading: 'Side effects', body: 'Common side effects of pain medications include: drowsiness, nausea, constipation, and dizziness. If side effects are severe, contact your care team for alternative options.', icon: 'warning' },
      { heading: 'Medication interactions', body: 'Inform your care team of ALL medications you take, including over-the-counter drugs, vitamins, and supplements. Do not take aspirin or blood thinners unless directed.', icon: 'swap-horizontal' },
    ],
  },
  warning: {
    title: 'When to Seek Help',
    items: [
      { heading: '🚨 Call 911 immediately if you experience', body: '• Severe chest pain or difficulty breathing\n• Sudden severe headache or confusion\n• Signs of stroke (face drooping, arm weakness, speech difficulty)\n• Heavy uncontrolled bleeding from the surgical site', icon: 'alert-circle' },
      { heading: '⚠️ Contact your care team urgently for', body: '• Fever above 38.5°C (101.3°F)\n• Increasing pain not controlled by medication\n• Redness, swelling, or drainage from the incision\n• Persistent nausea or vomiting\n• Inability to urinate for more than 8 hours', icon: 'call' },
      { heading: '📋 Report at your next check-in', body: '• Mild increase in pain or discomfort\n• Minor swelling near the incision\n• Difficulty sleeping\n• Mood changes or feelings of sadness\n• Questions about activity restrictions', icon: 'clipboard' },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      { heading: 'When can I shower?', body: 'You may shower 24-48 hours after surgery, unless your surgeon instructs otherwise. Let water run over the incision gently. Do not scrub the area. Pat dry afterwards.', icon: 'water' },
      { heading: 'Is it normal to feel tired?', body: 'Yes! Fatigue is very common after surgery. Your body is using energy to heal. Listen to your body and rest when needed. Most patients feel their energy returning within 1-2 weeks.', icon: 'moon' },
      { heading: 'Why is my abdomen bloated?', body: 'Bloating is normal after laparoscopic surgery due to the gas used during the procedure. It typically resolves within 2-3 days. Walking helps move the gas through your system faster.', icon: 'body' },
      { heading: 'Can I sleep on my side?', body: 'Sleep in whatever position is most comfortable. Many patients find sleeping on their back or non-operative side with a pillow for support most comfortable in the first few days.', icon: 'bed' },
      { heading: 'When should I schedule my follow-up?', body: 'Your follow-up appointment should be scheduled 7-14 days after surgery. If you do not already have one scheduled, contact your surgeon\'s office within 2 days of discharge.', icon: 'calendar' },
    ],
  },
};

export default function ResourcesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('wound');

  const content = CONTENT[activeCategory];

  return (
    <View style={rs.container}>
      {/* Header */}
      <View style={rs.header}>
        <TouchableOpacity onPress={() => router.back()} style={rs.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={rs.title}>Resources</Text>
          <Text style={rs.subtitle}>Post-surgery care guides</Text>
        </View>
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rs.catScroll} contentContainerStyle={rs.catRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[rs.catPill, activeCategory === cat.id && { backgroundColor: Colors.primary.navy }]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={16} color={activeCategory === cat.id ? '#FFF' : cat.color} />
            <Text style={[rs.catText, activeCategory === cat.id && { color: '#FFF' }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Section title */}
        <Text style={rs.sectionTitle}>{content.title}</Text>

        {/* Content cards */}
        {content.items.map((item, i) => {
          const cat = CATEGORIES.find(c => c.id === activeCategory)!;
          return (
            <View key={i} style={rs.card}>
              <View style={rs.cardHeader}>
                <View style={[rs.cardIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={(item.icon || cat.icon) as any} size={18} color={cat.color} />
                </View>
                <Text style={rs.cardHeading}>{item.heading}</Text>
              </View>
              <Text style={rs.cardBody}>{item.body}</Text>
            </View>
          );
        })}

        {/* Emergency footer */}
        <View style={rs.emergencyCard}>
          <LinearGradient
            colors={[Colors.semantic.error, '#C0392B']}
            style={rs.emergencyGradient}
          >
            <Ionicons name="call" size={24} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={rs.emergencyTitle}>Need immediate help?</Text>
              <Text style={rs.emergencyDesc}>If you experience a medical emergency, call 911 or your local emergency number.</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const rs = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text.primary },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  catScroll: { maxHeight: 52, marginBottom: 8 },
  catRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFF', ...Shadow.sm },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginHorizontal: 24, marginTop: 16, marginBottom: 12 },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 18, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardHeading: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  cardBody: { fontSize: 14, lineHeight: 22, color: Colors.text.secondary },
  emergencyCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  emergencyGradient: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  emergencyTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  emergencyDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 18 },
});
