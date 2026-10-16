import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackSafely } from '@/utils/navigation';

type EventType = 'messe' | 'catéchisme' | 'réunion' | 'personnel' | 'chorale' | 'prière';
type AgendaEvent = {
  id: string;
  title: string;
  dayIndex: number;
  type: EventType;
  dateLabel: string;
  time: string;
  duration: string;
  location: string;
};
type EventFilter = 'Tous' | 'Messe' | 'Catéchisme' | 'Réunion' | 'Personnel' | 'Chorale' | 'Prière';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  primary: '#006B76',
  navy: '#0A1F44',
  gold: '#D4AF37',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  green: '#059669',
  red: '#DC2626',
  purple: '#7C3AED',
  orange: '#D97706',
  rose: '#D96A8E',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const FILTERS: EventFilter[] = ['Tous', 'Messe', 'Catéchisme', 'Réunion', 'Personnel', 'Chorale', 'Prière'];
const EVENT_COLORS: Record<EventType, string> = {
  messe: COLORS.primary,
  catéchisme: COLORS.purple,
  réunion: COLORS.orange,
  personnel: COLORS.navy,
  chorale: COLORS.rose,
  prière: COLORS.gold,
};

const INITIAL_EVENTS: AgendaEvent[] = [
  { id: '1', title: 'Messe dominicale', dayIndex: 6, type: 'messe', dateLabel: '22 sept.', time: '08:30', duration: '1h30', location: 'Sainte Marie — Conakry' },
  { id: '2', title: 'Répétition chorale', dayIndex: 6, type: 'chorale', dateLabel: '22 sept.', time: '16:00', duration: '2h', location: 'Salle paroissiale' },
  { id: '3', title: 'Catéchisme enfants', dayIndex: 0, type: 'catéchisme', dateLabel: '23 sept.', time: '17:00', duration: '1h', location: 'Paroisse Sainte Marie' },
  { id: '4', title: 'Réunion des jeunes', dayIndex: 1, type: 'réunion', dateLabel: '24 sept.', time: '19:00', duration: '1h30', location: 'Centre paroissial' },
  { id: '5', title: 'Adoration eucharistique', dayIndex: 3, type: 'prière', dateLabel: '26 sept.', time: '18:00', duration: '1h', location: 'Chapelle' },
  { id: '6', title: 'Messe anticipée', dayIndex: 5, type: 'messe', dateLabel: '28 sept.', time: '18:00', duration: '1h', location: 'Sainte Marie — Conakry' },
];

const TYPE_LABELS: Record<EventType, string> = {
  messe: 'Messe',
  catéchisme: 'Catéchisme',
  réunion: 'Réunion',
  personnel: 'Personnel',
  chorale: 'Chorale',
  prière: 'Prière',
};

export default function AgendaScreen() {
  const router = useRouter();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>('Tous');
  const [selectedDayIndex, setSelectedDayIndex] = useState(6);
  const [events, setEvents] = useState(INITIAL_EVENTS);

  const referenceDate = new Date(2024, 8 + monthOffset, 22);
  const weekStart = new Date(referenceDate);
  weekStart.setDate(referenceDate.getDate() - ((referenceDate.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const monthLabel = `${MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;

  const visibleEvents = useMemo(() => {
    if (monthOffset !== 0) return [];
    if (selectedFilter === 'Tous') return events;
    return events.filter((event) => TYPE_LABELS[event.type] === selectedFilter);
  }, [events, monthOffset, selectedFilter]);
  const selectedEvents = visibleEvents.filter((event) => event.dayIndex === selectedDayIndex);
  const upcomingEvents = visibleEvents.filter((event) => event.dayIndex > selectedDayIndex);

  const formatDay = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()].toLocaleLowerCase()}`;

  const addEvent = () => {
    const date = days[selectedDayIndex];
    const event: AgendaEvent = {
      id: `personal-${Date.now()}`,
      title: 'Événement personnel',
      dayIndex: selectedDayIndex,
      type: 'personnel',
      dateLabel: `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3).toLocaleLowerCase()}.`,
      time: '17:00',
      duration: '1h',
      location: 'Mon agenda',
    };
    setEvents((current) => [...current, event]);
    setSelectedFilter('Tous');
    Alert.alert('Ajouté à votre agenda', 'Votre événement personnel a bien été ajouté.');
  };

  const openEvent = (event: AgendaEvent) => {
    Alert.alert(event.title, `${event.dateLabel} · ${event.time} (${event.duration})\n${event.location}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={goBackSafely} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Mon agenda</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" onPress={() => { setMonthOffset((value) => value - 1); setSelectedDayIndex(0); }} style={styles.monthArrow}>
          <SymbolView name="chevron.left" size={16} tintColor={COLORS.text} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" onPress={() => { setMonthOffset((value) => value + 1); setSelectedDayIndex(0); }} style={styles.monthArrow}>
          <SymbolView name="chevron.right" size={16} tintColor={COLORS.text} />
        </Pressable>
        <Pressable onPress={() => { setMonthOffset(0); setSelectedDayIndex(6); }} style={styles.todayButton}>
          <Text style={styles.todayLabel}>Aujourd’hui</Text>
        </Pressable>
      </View>

      <View style={styles.calendarRow}>
        {days.map((date, index) => {
          const active = selectedDayIndex === index;
          const hasEvents = monthOffset === 0 && events.some((event) => event.dayIndex === index);
          return (
            <Pressable
              key={date.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedDayIndex(index)}
              style={[styles.dayCell, active && styles.dayCellActive]}
            >
              <Text style={[styles.dayName, active && styles.dayNameActive]}>{WEEKDAYS[index]}</Text>
              <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{date.getDate()}</Text>
              <View style={[styles.eventDot, hasEvents && styles.eventDotVisible, active && hasEvents && styles.eventDotActive]} />
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => {
          const active = selectedFilter === filter;
          return (
            <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.eventScroll} contentContainerStyle={styles.eventContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedDayIndex === 6 && monthOffset === 0 ? 'Aujourd’hui' : `${WEEKDAYS[selectedDayIndex]}. ${days[selectedDayIndex].getDate()}`}</Text>
          <Text style={styles.eventCount}>{selectedEvents.length} événement{selectedEvents.length === 1 ? '' : 's'}</Text>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <View style={styles.emptyIcon}>
              <SymbolView name="calendar" size={23} tintColor={COLORS.muted} />
            </View>
            <Text style={styles.emptyTitle}>Aucun événement prévu</Text>
            <Text style={styles.emptyText}>Ajoutez un événement à cette journée.</Text>
          </View>
        ) : selectedEvents.map((event) => <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />)}

        {upcomingEvents.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.upcomingHeader]}>
              <Text style={styles.sectionTitle}>À venir cette semaine</Text>
              <Text style={styles.eventCount}>{upcomingEvents.length}</Text>
            </View>
            {upcomingEvents.map((event) => <EventCard key={`upcoming-${event.id}`} event={event} onPress={() => openEvent(event)} />)}
          </>
        )}
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un événement" onPress={addEvent} style={styles.addButton}>
        <SymbolView name="plus" size={22} tintColor={COLORS.surface} />
      </Pressable>
    </SafeAreaView>
  );
}

function EventCard({ event, onPress }: { event: AgendaEvent; onPress: () => void }) {
  const color = EVENT_COLORS[event.type];
  return (
    <Pressable onPress={onPress} style={styles.eventCard}>
      <View style={[styles.eventIcon, { backgroundColor: `${color}18` }]}>
        <SymbolView name={event.type === 'messe' ? 'cross' : event.type === 'chorale' ? 'music.note' : event.type === 'prière' ? 'hands.sparkles' : 'calendar'} size={20} tintColor={color} />
      </View>
      <View style={styles.eventInfo}>
        <Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventMeta}>{event.dateLabel} · {event.time} · {event.duration}</Text>
        <Text numberOfLines={1} style={styles.eventLocation}>{event.location}</Text>
      </View>
      <View style={[styles.typeBadge, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.typeLabel, { color }]}>{TYPE_LABELS[event.type]}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  monthRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  monthArrow: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  todayButton: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#006B7612' },
  todayLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 12 },
  dayCell: { flex: 1, minWidth: 36, minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12 },
  dayCellActive: { backgroundColor: COLORS.primary },
  dayName: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  dayNameActive: { color: '#FFFFFFCC' },
  dayNumber: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  dayNumberActive: { color: COLORS.surface },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  eventDotVisible: { backgroundColor: COLORS.gold },
  eventDotActive: { backgroundColor: COLORS.surface },
  filters: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.surface },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  filterLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  filterLabelActive: { color: COLORS.surface },
  eventScroll: { flex: 1 },
  eventContent: { gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 90 },
  sectionHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  eventCount: { color: COLORS.muted, fontSize: 12 },
  eventCard: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  eventIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  eventMeta: { color: COLORS.muted, fontSize: 11 },
  eventLocation: { color: COLORS.muted, fontSize: 11 },
  typeBadge: { maxWidth: 82, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  typeLabel: { fontSize: 10, fontWeight: '700' },
  upcomingHeader: { marginTop: 12 },
  emptyDay: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: COLORS.background },
  emptyTitle: { marginTop: 12, color: COLORS.text, fontSize: 15, fontWeight: '700' },
  emptyText: { marginTop: 5, color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  addButton: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: COLORS.primary, elevation: 5 },
});