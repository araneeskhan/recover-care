import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadow, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/Colors';
import { woundPhotoAPI } from '../services/api';

const DEMO_PHOTOS = [
  { id: '1', photoUri: '', caption: 'Day 1 post-op — bandage just removed, slight redness around incision', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '2', photoUri: '', caption: 'Day 2 — swelling going down, cleaned with saline', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '3', photoUri: '', caption: 'Day 3 — looking much better, no discharge', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '4', photoUri: '', caption: 'Day 4 — healing nicely, pinkness fading', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
];

const WOUND_COLORS = ['#E74C3C', '#F2994A', '#F2C94C', '#27AE60'];
const WOUND_STATUS = ['Inflamed', 'Healing', 'Improving', 'Healthy'];

export default function WoundJournalScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCaption, setNewCaption] = useState('');

  const fetchPhotos = useCallback(async () => {
    try {
      const r = await woundPhotoAPI.getAll();
      setPhotos(r.data?.length ? r.data : DEMO_PHOTOS);
    } catch {
      setPhotos(DEMO_PHOTOS);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const onRefresh = async () => { setRefreshing(true); await fetchPhotos(); setRefreshing(false); };

  const handleAddPhoto = async () => {
    // In a real implementation, we'd use expo-image-picker here
    Alert.alert(
      '📸 Take Photo',
      'In a real device, this would open your camera to photograph your incision site.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Capture',
          onPress: async () => {
            try {
              await woundPhotoAPI.create({
                photoUri: `local://wound_day_${photos.length + 1}.jpg`,
                caption: newCaption || `Day ${photos.length + 1} incision photo`,
              });
              setNewCaption('');
              setShowAddModal(false);
              fetchPhotos();
            } catch {
              // Add locally for demo
              setPhotos(prev => [{
                id: String(prev.length + 1),
                photoUri: '',
                caption: newCaption || `Day ${photos.length + 1} incision photo`,
                createdAt: new Date().toISOString(),
              }, ...prev]);
              setNewCaption('');
              setShowAddModal(false);
            }
          }
        },
      ]
    );
  };

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const fmtTime = (s: string) => {
    return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getDayNumber = (s: string) => {
    const diff = Math.ceil((new Date().getTime() - new Date(s).getTime()) / 86400000);
    return Math.max(1, diff);
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Wound Journal</Text>
        <TouchableOpacity style={st.addBtn} onPress={() => setShowAddModal(!showAddModal)}>
          <Ionicons name="camera" size={22} color={Colors.neutral.white} />
        </TouchableOpacity>
      </View>

      {/* Summary Strip */}
      <View style={st.summaryStrip}>
        <View style={st.summaryItem}>
          <Text style={st.summaryValue}>{photos.length}</Text>
          <Text style={st.summaryLabel}>Photos</Text>
        </View>
        <View style={[st.summaryItem, st.summaryBorder]}>
          <Text style={st.summaryValue}>{photos.length > 0 ? getDayNumber(photos[photos.length - 1]?.createdAt) : 0}</Text>
          <Text style={st.summaryLabel}>Days Tracked</Text>
        </View>
        <View style={st.summaryItem}>
          <View style={[st.statusDot, { backgroundColor: WOUND_COLORS[Math.min(photos.length - 1, 3)] || '#27AE60' }]} />
          <Text style={st.summaryLabel}>{WOUND_STATUS[Math.min(photos.length - 1, 3)] || 'Healthy'}</Text>
        </View>
      </View>

      {/* Add Photo Modal */}
      {showAddModal && (
        <View style={st.addModal}>
          <View style={st.addModalInner}>
            <Text style={st.addModalTitle}>📸 New Wound Photo</Text>
            <Text style={st.addModalDesc}>Take a photo of your incision site to track healing progress.</Text>
            <TextInput
              style={st.captionInput}
              placeholder="Add a note (e.g., less redness today)..."
              placeholderTextColor={Colors.text.tertiary}
              value={newCaption}
              onChangeText={setNewCaption}
              multiline
            />
            <View style={st.addModalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.captureBtn} onPress={handleAddPhoto}>
                <Ionicons name="camera" size={18} color="#FFF" />
                <Text style={st.captureBtnText}>Capture</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={st.scrollArea}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}
      >
        {/* Timeline */}
        <View style={st.timeline}>
          {photos.map((photo, idx) => {
            const dayNum = getDayNumber(photo.createdAt);
            const statusIdx = Math.min(idx, 3);
            return (
              <View key={photo.id} style={st.timelineEntry}>
                {/* Timeline line */}
                <View style={st.timelineLeft}>
                  <View style={[st.timelineDot, { backgroundColor: WOUND_COLORS[statusIdx] }]}>
                    <Ionicons name="bandage" size={14} color="#FFF" />
                  </View>
                  {idx < photos.length - 1 && <View style={st.timelineLine} />}
                </View>

                {/* Card */}
                <View style={st.timelineCard}>
                  <View style={st.cardHeader}>
                    <View>
                      <Text style={st.cardDay}>Day {dayNum}</Text>
                      <Text style={st.cardDate}>{fmtDate(photo.createdAt)} · {fmtTime(photo.createdAt)}</Text>
                    </View>
                    <View style={[st.statusBadge, { backgroundColor: WOUND_COLORS[statusIdx] + '18' }]}>
                      <View style={[st.statusBadgeDot, { backgroundColor: WOUND_COLORS[statusIdx] }]} />
                      <Text style={[st.statusBadgeText, { color: WOUND_COLORS[statusIdx] }]}>{WOUND_STATUS[statusIdx]}</Text>
                    </View>
                  </View>

                  {/* Photo placeholder */}
                  <View style={st.photoPlaceholder}>
                    <View style={st.photoPlaceholderInner}>
                      <Ionicons name="image" size={32} color={Colors.neutral.mediumGray} />
                      <Text style={st.photoPlaceholderText}>Wound Photo</Text>
                      <Text style={st.photoPlaceholderSub}>Day {dayNum} capture</Text>
                    </View>
                  </View>

                  {photo.caption && (
                    <View style={st.captionArea}>
                      <Ionicons name="document-text" size={14} color={Colors.text.secondary} />
                      <Text style={st.captionText}>{photo.caption}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <View style={st.tipsCard}>
          <View style={st.tipsHeader}>
            <Ionicons name="bulb" size={18} color={Colors.semantic.warning} />
            <Text style={st.tipsTitle}>Photo Tips</Text>
          </View>
          <Text style={st.tipsText}>• Use natural lighting for accurate colors{'\n'}• Keep the same angle and distance each day{'\n'}• Include a ruler or coin for size reference{'\n'}• Take photos at the same time daily</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary.teal, justifyContent: 'center', alignItems: 'center', ...Shadow.md },

  summaryStrip: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 8, ...Shadow.sm },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  summaryBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border.light },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.text.secondary },
  statusDot: { width: 20, height: 20, borderRadius: 10 },

  addModal: { marginHorizontal: 16, marginBottom: 12 },
  addModalInner: { backgroundColor: '#FFF', borderRadius: BorderRadius.xl, padding: 20, ...Shadow.md },
  addModalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text.primary, marginBottom: 4 },
  addModalDesc: { fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 16 },
  captionInput: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, padding: 14, fontSize: FontSize.md, color: Colors.text.primary, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.border.light },
  addModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
  cancelBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.secondary },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary.teal, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
  captureBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#FFF' },

  scrollArea: { flex: 1 },
  timeline: { paddingHorizontal: 16, paddingTop: 16 },
  timelineEntry: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { width: 36, alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border.light, marginTop: -2 },
  timelineCard: { flex: 1, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: 16, marginLeft: 12, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardDay: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text.primary },
  cardDate: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5 },
  statusBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  photoPlaceholder: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: 12 },
  photoPlaceholderInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  photoPlaceholderText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.neutral.mediumGray, marginTop: 8 },
  photoPlaceholderSub: { fontSize: FontSize.xs, color: Colors.neutral.mediumGray, marginTop: 2 },

  captionArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  captionText: { flex: 1, fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 18 },

  tipsCard: { backgroundColor: Colors.semantic.warningLight, marginHorizontal: 16, borderRadius: BorderRadius.lg, padding: 16, marginTop: 8 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipsTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text.primary },
  tipsText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
});
