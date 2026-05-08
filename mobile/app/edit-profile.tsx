import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { patientAPI, authAPI } from '../services/api';
import { Colors, Shadow, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/Colors';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  // Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');

  // Medical Information
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Address
  const [address, setAddress] = useState('');

  // Password Change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  // Surgery info (read-only display)
  const [surgeryType, setSurgeryType] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [hospital, setHospital] = useState('');
  const [mrn, setMrn] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await patientAPI.getProfile();
      const p = response.data;
      setFirstName(p.firstName || '');
      setLastName(p.lastName || '');
      setAge(p.age?.toString() || '');
      setPhone(p.phone || '');
      setBloodType(p.bloodType || '');
      setAllergies(p.allergies || '');
      setEmergencyName(p.emergencyContactName || '');
      setEmergencyPhone(p.emergencyContactPhone || '');
      setAddress(p.address || '');
      setSurgeryType(p.surgeryType || '');
      setSurgeryDate(p.surgeryDate || '');
      setHospital(p.hospital || '');
      setMrn(p.mrn || '');
      setOriginalData(p);
    } catch {
      // Use demo fallback
      setFirstName('Sarah');
      setLastName('Chen');
      setAge('42');
      setPhone('');
      setSurgeryType('Laparoscopic Cholecystectomy');
      setSurgeryDate('2026-05-02');
      setHospital('Mercy General');
      setMrn('4729-883');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!originalData) return;
    const changed =
      firstName !== (originalData.firstName || '') ||
      lastName !== (originalData.lastName || '') ||
      age !== (originalData.age?.toString() || '') ||
      phone !== (originalData.phone || '') ||
      bloodType !== (originalData.bloodType || '') ||
      allergies !== (originalData.allergies || '') ||
      emergencyName !== (originalData.emergencyContactName || '') ||
      emergencyPhone !== (originalData.emergencyContactPhone || '') ||
      address !== (originalData.address || '');
    setHasChanges(changed);
  }, [firstName, lastName, age, phone, bloodType, allergies, emergencyName, emergencyPhone, address, originalData]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.');
      return;
    }

    const ageNum = parseInt(age);
    if (age && (isNaN(ageNum) || ageNum < 1 || ageNum > 150)) {
      Alert.alert('Invalid', 'Please enter a valid age.');
      return;
    }

    setIsSaving(true);
    try {
      await patientAPI.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNum || undefined,
        phone: phone.trim() || undefined,
        bloodType: bloodType || undefined,
        allergies: allergies.trim() || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        address: address.trim() || undefined,
      });

      // Sync auth context
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary.teal} />
        <Text style={{ color: Colors.text.secondary, marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleDiscard} style={s.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {firstName[0] || ''}{lastName[0] || ''}
              </Text>
            </View>
            <Text style={s.avatarName}>{firstName} {lastName}</Text>
            <Text style={s.avatarSub}>MRN · {mrn}</Text>
          </View>

          {/* Personal Information */}
          <Text style={s.sectionTitle}>PERSONAL INFORMATION</Text>
          <View style={s.card}>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.label}>First Name</Text>
                <TextInput
                  style={s.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={Colors.neutral.mediumGray}
                />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.label}>Last Name</Text>
                <TextInput
                  style={s.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={Colors.neutral.mediumGray}
                />
              </View>
            </View>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.label}>Age</Text>
                <TextInput
                  style={s.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.neutral.mediumGray}
                />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.label}>Phone</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.neutral.mediumGray}
                />
              </View>
            </View>
            <View style={s.fieldFull}>
              <Text style={s.label}>Address</Text>
              <TextInput
                style={s.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, City, State"
                placeholderTextColor={Colors.neutral.mediumGray}
              />
            </View>
          </View>

          {/* Medical Information */}
          <Text style={s.sectionTitle}>MEDICAL INFORMATION</Text>
          <View style={s.card}>
            <View style={s.fieldFull}>
              <Text style={s.label}>Blood Type</Text>
              <View style={s.bloodTypeRow}>
                {BLOOD_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[s.bloodTypeChip, bloodType === bt && s.bloodTypeChipActive]}
                    onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                  >
                    <Text style={[s.bloodTypeText, bloodType === bt && s.bloodTypeTextActive]}>
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.fieldFull}>
              <Text style={s.label}>Allergies</Text>
              <TextInput
                style={[s.input, s.inputMultiline]}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="List any known allergies"
                placeholderTextColor={Colors.neutral.mediumGray}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Surgery Info (Read Only) */}
          <Text style={s.sectionTitle}>SURGERY DETAILS</Text>
          <View style={s.card}>
            <View style={s.readOnlyBanner}>
              <Ionicons name="lock-closed" size={14} color={Colors.neutral.mediumGray} />
              <Text style={s.readOnlyText}>Managed by your care team</Text>
            </View>
            <View style={s.fieldFull}>
              <Text style={s.label}>Surgery Type</Text>
              <View style={s.readOnlyField}>
                <Text style={s.readOnlyValue}>{surgeryType}</Text>
              </View>
            </View>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.label}>Surgery Date</Text>
                <View style={s.readOnlyField}>
                  <Text style={s.readOnlyValue}>
                    {surgeryDate ? new Date(surgeryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </Text>
                </View>
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.label}>Hospital</Text>
                <View style={s.readOnlyField}>
                  <Text style={s.readOnlyValue}>{hospital}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <Text style={s.sectionTitle}>EMERGENCY CONTACT</Text>
          <View style={s.card}>
            <View style={s.fieldFull}>
              <Text style={s.label}>Contact Name</Text>
              <TextInput
                style={s.input}
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Full name"
                placeholderTextColor={Colors.neutral.mediumGray}
              />
            </View>
            <View style={s.fieldFull}>
              <Text style={s.label}>Contact Phone</Text>
              <TextInput
                style={s.input}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="+1 (555) 000-0000"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.neutral.mediumGray}
              />
            </View>
          </View>

          {/* Security */}
          <Text style={s.sectionTitle}>SECURITY</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={s.passwordToggle}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
            >
              <View style={s.passwordToggleLeft}>
                <View style={s.passwordIcon}>
                  <Ionicons name="key" size={18} color={Colors.primary.teal} />
                </View>
                <View>
                  <Text style={s.passwordToggleTitle}>Change Password</Text>
                  <Text style={s.passwordToggleSub}>Update your account password</Text>
                </View>
              </View>
              <Ionicons
                name={showPasswordSection ? 'chevron-up' : 'chevron-forward'}
                size={20}
                color={Colors.neutral.mediumGray}
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={s.passwordForm}>
                <View style={s.fieldFull}>
                  <Text style={s.label}>Current Password</Text>
                  <View style={s.passwordInput}>
                    <TextInput
                      style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={Colors.neutral.mediumGray}
                      secureTextEntry={!showCurrentPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={s.eyeBtn}
                    >
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.neutral.mediumGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.fieldFull}>
                  <Text style={s.label}>New Password</Text>
                  <View style={s.passwordInput}>
                    <TextInput
                      style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="At least 6 characters"
                      placeholderTextColor={Colors.neutral.mediumGray}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={s.eyeBtn}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.neutral.mediumGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.fieldFull}>
                  <Text style={s.label}>Confirm New Password</Text>
                  <TextInput
                    style={s.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={Colors.neutral.mediumGray}
                    secureTextEntry
                  />
                </View>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={Colors.semantic.error} />
                    <Text style={s.errorText}>Passwords do not match</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    s.changePasswordBtn,
                    (!currentPassword || !newPassword || newPassword !== confirmPassword) && s.changePasswordBtnDisabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || isSaving}
                >
                  <Text style={s.changePasswordBtnText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  saveBtn: {
    backgroundColor: Colors.primary.teal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnDisabled: { backgroundColor: Colors.border.light },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  saveBtnTextDisabled: { color: Colors.neutral.mediumGray },
  content: { flex: 1, paddingHorizontal: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  avatarName: { fontSize: 22, fontWeight: '700', color: Colors.text.primary },
  avatarSub: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    ...Shadow.sm,
  },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldHalf: { flex: 1 },
  fieldFull: { marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  bloodTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  bloodTypeChipActive: {
    borderColor: Colors.primary.teal,
    backgroundColor: 'rgba(26, 158, 143, 0.08)',
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  bloodTypeTextActive: {
    color: Colors.primary.teal,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  readOnlyText: { fontSize: 12, color: Colors.neutral.mediumGray, fontWeight: '500' },
  readOnlyField: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  readOnlyValue: { fontSize: 15, color: Colors.text.secondary },
  passwordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  passwordToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 158, 143, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  passwordToggleSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 1 },
  passwordForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: 14,
  },
  eyeBtn: { padding: 8 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: Colors.semantic.error },
  changePasswordBtn: {
    backgroundColor: Colors.primary.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  changePasswordBtnDisabled: { opacity: 0.4 },
  changePasswordBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
