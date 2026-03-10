import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BusinessHours'>;
  route: { params: { agentId: string } };
};

interface DaySchedule {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
}

type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_SCHEDULE: WeekSchedule = {
  Monday:    { enabled: true, start: '09:00', end: '17:00' },
  Tuesday:   { enabled: true, start: '09:00', end: '17:00' },
  Wednesday: { enabled: true, start: '09:00', end: '17:00' },
  Thursday:  { enabled: true, start: '09:00', end: '17:00' },
  Friday:    { enabled: true, start: '09:00', end: '17:00' },
  Saturday:  { enabled: false, start: '10:00', end: '14:00' },
  Sunday:    { enabled: false, start: '10:00', end: '14:00' },
};

// Generate time slots from 6:00 AM to 11:00 PM in 30-min increments
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 23) TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function storageKey(agentId: string) {
  return `@holdplease_hours_${agentId}`;
}

export default function BusinessHoursScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { agentId } = route.params;

  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Time picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDay, setPickerDay] = useState('');
  const [pickerField, setPickerField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey(agentId));
        if (stored) setSchedule(JSON.parse(stored));
      } catch {}
    })();
  }, [agentId]);

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
    setHasChanges(true);
  };

  const openTimePicker = (day: string, field: 'start' | 'end') => {
    setPickerDay(day);
    setPickerField(field);
    setPickerVisible(true);
  };

  const selectTime = (time: string) => {
    setSchedule((prev) => ({
      ...prev,
      [pickerDay]: { ...prev[pickerDay], [pickerField]: time },
    }));
    setHasChanges(true);
    setPickerVisible(false);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey(agentId), JSON.stringify(schedule));
      setHasChanges(false);
      Alert.alert('Saved', 'Business hours have been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [schedule, agentId, navigation]);

  const activeDays = DAYS.filter((d) => schedule[d].enabled);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Business Hours</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.summaryCard}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={s.summaryText}>
            {activeDays.length === 0
              ? 'No active days set'
              : activeDays.length === 7
              ? 'Active every day'
              : `Active ${activeDays.length} day${activeDays.length > 1 ? 's' : ''} a week`}
          </Text>
        </View>

        <Text style={s.note}>
          Your agent will only answer calls during these hours. Outside of business hours, callers will hear a closed message.
        </Text>

        {/* Schedule */}
        <View style={s.card}>
          {DAYS.map((day, i) => {
            const ds = schedule[day];
            return (
              <React.Fragment key={day}>
                {i > 0 && <View style={s.sep} />}
                <View style={s.dayRow}>
                  <View style={s.dayLeft}>
                    <Switch
                      value={ds.enabled}
                      onValueChange={() => toggleDay(day)}
                      trackColor={{ false: colors.switchTrack, true: colors.success }}
                      thumbColor={colors.white}
                      style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                    <Text style={[s.dayName, !ds.enabled && s.dayNameOff]}>
                      {DAY_SHORT[i]}
                    </Text>
                  </View>

                  {ds.enabled ? (
                    <View style={s.timeRange}>
                      <TouchableOpacity
                        style={s.timePill}
                        onPress={() => openTimePicker(day, 'start')}
                        activeOpacity={0.6}
                      >
                        <Text style={s.timeText}>{formatTime(ds.start)}</Text>
                      </TouchableOpacity>
                      <Text style={s.timeDash}>—</Text>
                      <TouchableOpacity
                        style={s.timePill}
                        onPress={() => openTimePicker(day, 'end')}
                        activeOpacity={0.6}
                      >
                        <Text style={s.timeText}>{formatTime(ds.end)}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={s.closedText}>Closed</Text>
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Quick set */}
        <View style={s.quickRow}>
          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => {
              const updated: WeekSchedule = {};
              for (const day of DAYS) {
                updated[day] = { ...schedule[day], enabled: true };
              }
              setSchedule(updated);
              setHasChanges(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={s.quickText}>Enable All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickBtn}
            onPress={() => {
              setSchedule(DEFAULT_SCHEDULE);
              setHasChanges(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={s.quickText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]}
          onPress={save}
          disabled={!hasChanges || saving}
          activeOpacity={0.8}
        >
          <Text style={[s.saveBtnText, !hasChanges && s.saveBtnTextDisabled]}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>
              {pickerDay} — {pickerField === 'start' ? 'Opens at' : 'Closes at'}
            </Text>
            <ScrollView style={s.timeList} showsVerticalScrollIndicator={false}>
              {TIME_SLOTS.map((t) => {
                const current = pickerDay && schedule[pickerDay]?.[pickerField];
                const selected = t === current;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeOption, selected && s.timeOptionSelected]}
                    onPress={() => selectTime(t)}
                    activeOpacity={0.6}
                  >
                    <Text style={[s.timeOptionText, selected && s.timeOptionTextSelected]}>
                      {formatTime(t)}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  summaryText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 2,
  },

  // Schedule card
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayName: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, width: 36 },
  dayNameOff: { color: colors.textMuted },

  timeRange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  timeDash: { fontSize: 13, color: colors.textMuted },
  closedText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  // Save
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  saveBtnTextDisabled: {},

  // Modal
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    maxHeight: '50%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  timeList: { paddingBottom: 30 },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  timeOptionSelected: { backgroundColor: colors.primarySoft },
  timeOptionText: { fontSize: 16, color: colors.textPrimary },
  timeOptionTextSelected: { fontWeight: '600' },
});
