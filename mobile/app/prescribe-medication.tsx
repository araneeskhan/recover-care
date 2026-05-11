import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { staffAPI } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

const FREQUENCIES = ['Once daily', '2× daily', '3× daily', 'Every 6h', 'Every 8h', 'Every 12h', 'As needed'];

export default function PrescribeMedicationScreen() {
  const router = useRouter();
  const { patientId, patientName, editMedId, editMedName, editMedDosage, editMedFreq } = useLocalSearchParams<{
    patientId: string; patientName: string;
    editMedId?: string; editMedName?: string; editMedDosage?: string; editMedFreq?: string;
  }>();

  const isEdit = !!editMedId;
  const accentColor = '#E67E22';

  const [name, setName] = useState(editMedName ?? '');
  const [dosage, setDosage] = useState(editMedDosage ?? '');
  const [frequency, setFrequency] = useState(editMedFreq ?? FREQUENCIES[0]);
  const [instructions, setInstructions] = useState('');
  const [totalDoses, setTotalDoses] = useState('28');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert('Missing Fields', 'Medication name and dosage are required');
      return;
    }
    if (!isEdit && (!totalDoses || isNaN(parseInt(totalDoses)))) {
      Alert.alert('Invalid', 'Enter a valid total dose count');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await staffAPI.updateMedication(patientId, editMedId!, { dosage, frequency, instructions: instructions || undefined, isActive });
      } else {
        await staffAPI.prescribeMedication(patientId, { name: name.trim(), dosage: dosage.trim(), frequency, instructions: instructions || undefined, totalDoses: parseInt(totalDoses) });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: '#7F4A00' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Medication' : 'Prescribe Medication'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.patientLabel}>Patient: {patientName}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Medication Name</Text>
          <TextInput style={[styles.input, isEdit && styles.inputDisabled]} value={name} onChangeText={setName} placeholder="e.g. Amoxicillin" placeholderTextColor={Colors.text.tertiary} editable={!isEdit} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dosage</Text>
          <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="e.g. 500mg" placeholderTextColor={Colors.text.tertiary} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.freqChip, frequency === f && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.freqText, frequency === f && { color: '#FFF' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Instructions (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} value={instructions} onChangeText={setInstructions} placeholder="e.g. Take with food, avoid alcohol..." placeholderTextColor={Colors.text.tertiary} multiline textAlignVertical="top" />
        </View>

        {!isEdit && (
          <View style={styles.field}>
            <Text style={styles.label}>Total Doses (supply)</Text>
            <TextInput style={styles.input} value={totalDoses} onChangeText={setTotalDoses} placeholder="28" placeholderTextColor={Colors.text.tertiary} keyboardType="number-pad" />
          </View>
        )}

        {isEdit && (
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: Colors.border.medium, true: accentColor }} thumbColor="#FFF" />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Prescribe Medication'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: Spacing.xl },
  headerTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  body: { padding: Spacing.xl, gap: 20 },
  patientLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.secondary, marginBottom: 4 },
  field: { gap: 8 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  input: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: 12, fontSize: FontSize.md, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border.light },
  inputDisabled: { backgroundColor: Colors.background.primary, color: Colors.text.secondary },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { borderWidth: 1, borderColor: Colors.border.medium, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  freqText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
