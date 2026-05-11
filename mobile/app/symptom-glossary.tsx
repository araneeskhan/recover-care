import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadow, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/Colors';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface Symptom {
  id: string;
  name: string;
  icon: string;
  severity: Severity;
  description: string;
  whenToWorry: string;
  selfCare: string;
  category: string;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string; icon: string }> = {
  low: { color: '#27AE60', bg: '#D4EFDF', label: 'Low', icon: 'checkmark-circle' },
  medium: { color: '#F2994A', bg: '#FDEBD0', label: 'Medium', icon: 'alert-circle' },
  high: { color: '#E74C3C', bg: '#FADBD8', label: 'High', icon: 'warning' },
  critical: { color: '#8E44AD', bg: '#E8DAEF', label: 'Critical', icon: 'alert' },
};

const SYMPTOMS: Symptom[] = [
  // Pain & Discomfort
  {
    id: '1', name: 'Incision Pain', icon: 'bandage', severity: 'low', category: 'Pain',
    description: 'Mild to moderate pain around the surgical site is normal during the first 1–2 weeks.',
    whenToWorry: 'Pain suddenly worsens after improving, or reaches 8+/10 despite medication.',
    selfCare: 'Take prescribed pain medication on schedule. Use ice packs (wrapped in cloth) for 15-minute intervals.',
  },
  {
    id: '2', name: 'Abdominal Cramping', icon: 'fitness', severity: 'low', category: 'Pain',
    description: 'Mild cramping or bloating is common due to gas from the surgical procedure.',
    whenToWorry: 'Severe, persistent cramping that doesn\'t improve with movement or medication.',
    selfCare: 'Walk gently for 10–15 minutes several times daily. Avoid carbonated drinks.',
  },
  {
    id: '3', name: 'Shoulder Pain', icon: 'body', severity: 'low', category: 'Pain',
    description: 'Referred pain from CO2 gas used in laparoscopic surgery. Usually resolves in 24–72 hours.',
    whenToWorry: 'Pain persists beyond 3 days or is accompanied by shortness of breath.',
    selfCare: 'Walk frequently. Lie on your left side with knees drawn to chest.',
  },
  // Wound-Related
  {
    id: '4', name: 'Redness Around Incision', icon: 'ellipse', severity: 'medium', category: 'Wound',
    description: 'Slight pinkness around the incision is part of normal healing.',
    whenToWorry: 'Redness spreads outward, becomes hot to touch, or has red streaks leading away from the wound.',
    selfCare: 'Keep the area clean and dry. Monitor daily — take photos to track changes.',
  },
  {
    id: '5', name: 'Wound Drainage', icon: 'water', severity: 'medium', category: 'Wound',
    description: 'Small amounts of clear or light yellow fluid are normal in the first few days.',
    whenToWorry: 'Drainage is thick, green/yellow, foul-smelling, or increasing in amount.',
    selfCare: 'Keep wound clean. Change dressings as instructed. Don\'t apply ointments unless directed.',
  },
  {
    id: '6', name: 'Swelling', icon: 'resize', severity: 'low', category: 'Wound',
    description: 'Mild swelling near the incision site is a normal inflammatory response.',
    whenToWorry: 'Swelling is rapidly increasing, spreading, or accompanied by fever.',
    selfCare: 'Elevate the area if possible. Apply ice packs in intervals. Wear loose clothing.',
  },
  // Systemic
  {
    id: '7', name: 'Fever', icon: 'thermometer', severity: 'high', category: 'Systemic',
    description: 'Low-grade fever (under 38°C / 100.4°F) can be normal for 24–48 hours post-surgery.',
    whenToWorry: 'Temperature exceeds 38.5°C / 101.3°F, or persists beyond 48 hours.',
    selfCare: 'Stay hydrated. Rest. Take temperature every 4 hours. Report to care team if elevated.',
  },
  {
    id: '8', name: 'Fatigue', icon: 'bed', severity: 'low', category: 'Systemic',
    description: 'Feeling tired is very common after surgery. Your body is using energy to heal.',
    whenToWorry: 'Exhaustion doesn\'t improve with rest, or worsens over several days.',
    selfCare: 'Sleep 8–10 hours. Take short naps. Gradually increase activity each day.',
  },
  {
    id: '9', name: 'Nausea', icon: 'sad', severity: 'medium', category: 'Systemic',
    description: 'Can result from anesthesia, pain medications, or eating too quickly after surgery.',
    whenToWorry: 'Persistent vomiting, inability to keep fluids down for 12+ hours.',
    selfCare: 'Eat bland foods in small portions. Sip clear fluids. Avoid greasy or spicy food.',
  },
  {
    id: '10', name: 'Dizziness', icon: 'sync', severity: 'medium', category: 'Systemic',
    description: 'Light-headedness may occur from pain medication, dehydration, or standing too quickly.',
    whenToWorry: 'Severe dizziness with confusion, blurred vision, or fainting.',
    selfCare: 'Stand up slowly. Stay hydrated. Sit down immediately if you feel faint.',
  },
  // Digestive
  {
    id: '11', name: 'Constipation', icon: 'remove-circle', severity: 'low', category: 'Digestive',
    description: 'Common side effect of pain medication (opioids) and reduced activity.',
    whenToWorry: 'No bowel movement for 3+ days, or accompanied by abdominal distension and vomiting.',
    selfCare: 'Increase fiber intake. Drink plenty of water. Walk regularly. Ask about stool softeners.',
  },
  {
    id: '12', name: 'Loss of Appetite', icon: 'restaurant', severity: 'low', category: 'Digestive',
    description: 'Reduced appetite is normal in the first few days after surgery.',
    whenToWorry: 'Cannot eat anything for more than 2 days, or rapid weight loss occurs.',
    selfCare: 'Eat small, frequent meals. Focus on high-protein, easy-to-digest foods.',
  },
  // Respiratory
  {
    id: '13', name: 'Shortness of Breath', icon: 'cloud', severity: 'critical', category: 'Respiratory',
    description: 'Mild breathlessness with exertion may be normal initially.',
    whenToWorry: 'Sudden onset at rest, chest pain, rapid heartbeat, or coughing up blood — CALL 911.',
    selfCare: 'Practice deep breathing exercises 10× every hour. Use incentive spirometer if provided.',
  },
  {
    id: '14', name: 'Coughing', icon: 'megaphone', severity: 'medium', category: 'Respiratory',
    description: 'A dry cough after general anesthesia is common and usually self-resolving.',
    whenToWorry: 'Productive cough with colored sputum, fever, or chest pain.',
    selfCare: 'Support your incision with a pillow when coughing. Stay hydrated. Use cough drops.',
  },
  // Vascular
  {
    id: '15', name: 'Leg Swelling / Pain', icon: 'walk', severity: 'high', category: 'Vascular',
    description: 'Unilateral leg swelling or calf pain could indicate deep vein thrombosis (DVT).',
    whenToWorry: 'One leg is noticeably more swollen than the other, warm, or painful — contact care team immediately.',
    selfCare: 'Move your legs frequently. Wear compression stockings if prescribed. Do ankle pumps.',
  },
];

const CATEGORIES = ['All', 'Pain', 'Wound', 'Systemic', 'Digestive', 'Respiratory', 'Vascular'];

export default function SymptomGlossaryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = SYMPTOMS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const severityCounts = {
    low: SYMPTOMS.filter(s => s.severity === 'low').length,
    medium: SYMPTOMS.filter(s => s.severity === 'medium').length,
    high: SYMPTOMS.filter(s => s.severity === 'high').length,
    critical: SYMPTOMS.filter(s => s.severity === 'critical').length,
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Symptom Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={st.searchContainer}>
        <View style={st.searchBar}>
          <Ionicons name="search" size={18} color={Colors.text.tertiary} />
          <TextInput
            style={st.searchInput}
            placeholder="Search symptoms..."
            placeholderTextColor={Colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Severity Legend */}
      <View style={st.legendRow}>
        {(['low', 'medium', 'high', 'critical'] as Severity[]).map(sev => (
          <View key={sev} style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: SEVERITY_CONFIG[sev].color }]} />
            <Text style={st.legendText}>{SEVERITY_CONFIG[sev].label}</Text>
            <Text style={st.legendCount}>{severityCounts[sev]}</Text>
          </View>
        ))}
      </View>

      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[st.chip, selectedCategory === cat && st.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[st.chipText, selectedCategory === cat && st.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Symptom List */}
      <ScrollView style={st.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={st.emptyState}>
            <Ionicons name="search" size={48} color={Colors.neutral.lightGray} />
            <Text style={st.emptyText}>No symptoms found</Text>
            <Text style={st.emptySubtext}>Try a different search term</Text>
          </View>
        )}
        {filtered.map(symptom => {
          const sev = SEVERITY_CONFIG[symptom.severity];
          const isExpanded = expandedId === symptom.id;
          return (
            <TouchableOpacity
              key={symptom.id}
              style={[st.symptomCard, isExpanded && st.symptomCardExpanded]}
              onPress={() => setExpandedId(isExpanded ? null : symptom.id)}
              activeOpacity={0.7}
            >
              {/* Header row */}
              <View style={st.symptomHeader}>
                <View style={[st.symptomIcon, { backgroundColor: sev.bg }]}>
                  <Ionicons name={symptom.icon as any} size={18} color={sev.color} />
                </View>
                <View style={st.symptomInfo}>
                  <Text style={st.symptomName}>{symptom.name}</Text>
                  <Text style={st.symptomCategory}>{symptom.category}</Text>
                </View>
                <View style={[st.severityBadge, { backgroundColor: sev.bg }]}>
                  <Ionicons name={sev.icon as any} size={12} color={sev.color} />
                  <Text style={[st.severityText, { color: sev.color }]}>{sev.label}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.neutral.mediumGray}
                  style={{ marginLeft: 8 }}
                />
              </View>

              {/* Description always visible */}
              <Text style={st.symptomDesc}>{symptom.description}</Text>

              {/* Expanded details */}
              {isExpanded && (
                <View style={st.expandedArea}>
                  <View style={st.detailSection}>
                    <View style={st.detailHeader}>
                      <Ionicons name="warning" size={14} color={Colors.semantic.error} />
                      <Text style={st.detailTitle}>When to Call Your Care Team</Text>
                    </View>
                    <Text style={st.detailText}>{symptom.whenToWorry}</Text>
                  </View>
                  <View style={st.detailSection}>
                    <View style={st.detailHeader}>
                      <Ionicons name="heart" size={14} color={Colors.semantic.success} />
                      <Text style={st.detailTitle}>Self-Care Tips</Text>
                    </View>
                    <Text style={st.detailText}>{symptom.selfCare}</Text>
                  </View>
                  <TouchableOpacity style={st.resourceLink} onPress={() => router.push('/resources')}>
                    <Ionicons name="book" size={14} color={Colors.primary.teal} />
                    <Text style={st.resourceLinkText}>View Related Discharge Instructions</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.primary.teal} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },

  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 10, ...Shadow.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text.primary, padding: 0 },

  legendRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  legendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFF', borderRadius: BorderRadius.sm, paddingVertical: 8, ...Shadow.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.text.secondary },
  legendCount: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.text.primary },

  chipRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12, height: 36 },
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.border.light },
  chipActive: { backgroundColor: Colors.primary.teal, borderColor: Colors.primary.teal },
  chipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text.secondary },
  chipTextActive: { color: '#FFF' },

  list: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text.secondary },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.text.tertiary },

  symptomCard: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: 16, marginBottom: 10, ...Shadow.sm, borderWidth: 1, borderColor: 'transparent' },
  symptomCardExpanded: { borderColor: Colors.primary.teal + '40' },
  symptomHeader: { flexDirection: 'row', alignItems: 'center' },
  symptomIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  symptomInfo: { flex: 1, marginLeft: 12 },
  symptomName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  symptomCategory: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  severityText: { fontSize: 10, fontWeight: FontWeight.bold },
  symptomDesc: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 10, lineHeight: 18 },

  expandedArea: { marginTop: 14, borderTopWidth: 1, borderTopColor: Colors.border.light, paddingTop: 14, gap: 14 },
  detailSection: { gap: 6 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text.primary },
  detailText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 18, marginLeft: 20 },
  resourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(26,158,143,0.06)', padding: 12, borderRadius: BorderRadius.md },
  resourceLinkText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.primary.teal },
});
