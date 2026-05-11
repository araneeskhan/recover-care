import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { staffAPI } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

const DURATIONS = [15, 30, 45, 60, 90];
const TEMPLATES = [
  { label: 'Post-op Review', description: 'Routine post-operative follow-up' },
  { label: 'Wound Check', description: 'Incision site inspection and wound care assessment' },
  { label: 'Medication Review', description: 'Review and adjust current medication regimen' },
  { label: 'Lab Results', description: 'Discuss recent laboratory results' },
  { label: 'Physiotherapy', description: 'Physical therapy and rehabilitation session' },
];

export default function ScheduleAppointmentScreen() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName: string }>();
  const accentColor = '#9B59B6';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.label);
    setDescription(t.description);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Missing Field', 'Appointment title is required'); return; }
    if (!date.trim() || !time.trim()) { Alert.alert('Missing Field', 'Date and time are required'); return; }

    const dateTimeStr = `${date}T${time}:00`;
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) { Alert.alert('Invalid Date/Time', 'Please enter a valid date (YYYY-MM-DD) and time (HH:MM)'); return; }
    if (dt <= new Date()) { Alert.alert('Invalid Date', 'Appointment must be in the future'); return; }

    setSaving(true);
    try {
      await staffAPI.scheduleAppointment(patientId, { title: title.trim(), description: description.trim() || undefined, dateTime: dt.toISOString(), duration });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to schedule appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.patientLabel}>Patient: {patientName}</Text>

        {/* Templates */}
        <View style={styles.field}>
          <Text style={styles.label}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.xl }} contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 8 }}>
            {TEMPLATES.map(t => (
              <TouchableOpacity key={t.label} style={styles.templateChip} onPress={() => applyTemplate(t)}>
                <Text style={styles.templateText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Post-op Review" placeholderTextColor={Colors.text.tertiary} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={description} onChangeText={setDescription} placeholder="Details about the appointment..." placeholderTextColor={Colors.text.tertiary} multiline textAlignVertical="top" />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.text.tertiary} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Time (24h)</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={Colors.text.tertiary} keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity key={d} style={[styles.durationChip, duration === d && { backgroundColor: accentColor, borderColor: accentColor }]} onPress={() => setDuration(d)}>
                <Text style={[styles.durationText, duration === d && { color: '#FFF' }]}>{d} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Schedule Appointment</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: Spacing.xl, backgroundColor: '#4A235A' },
  headerTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  body: { padding: Spacing.xl, gap: 20 },
  patientLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.secondary },
  field: { gap: 8 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  input: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 12, fontSize: FontSize.md, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border.light },
  row: { flexDirection: 'row', gap: 12 },
  templateChip: { backgroundColor: Colors.background.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border.light },
  templateText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: FontWeight.medium },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: { flex: 1, borderWidth: 1, borderColor: Colors.border.medium, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  durationText: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: FontWeight.medium },
  saveBtn: { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
