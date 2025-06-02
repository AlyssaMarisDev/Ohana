import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EventWithDetails, HouseholdWithMembers } from '@shared/schema';

const { width } = Dimensions.get('window');

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | null>(null);

  // Fetch user's households
  const { data: households } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  const currentHousehold = households?.find(h => h.id === currentHouseholdId) || households?.[0];

  // Fetch events for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: events, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events", { 
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
      householdId: currentHousehold?.id 
    }],
    enabled: !!currentHousehold,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  });

  const allEvents = events || [];

  // Get events for selected date
  const selectedDateEvents = allEvents.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
    
    return selectedDateStart >= eventStartDate && selectedDateStart <= eventEndDate;
  });

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          {currentHousehold && (
            <Text style={styles.subtitle}>{currentHousehold.name}</Text>
          )}
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={24} color="#6366f1" />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {format(currentDate, "MMMM yyyy")}
          </Text>
          
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {calendarDays.map(day => {
              const dayEvents = allEvents.filter(event => {
                const eventStart = new Date(event.startTime);
                const eventEnd = new Date(event.endTime);
                const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
                const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
                
                return dayStart >= eventStartDate && dayStart <= eventEndDate;
              });

              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDay,
                    isCurrentDay && styles.todayDay,
                    !isCurrentMonth && styles.otherMonthDay,
                  ]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text style={[
                    styles.dayNumber,
                    isSelected && styles.selectedDayText,
                    isCurrentDay && styles.todayDayText,
                    !isCurrentMonth && styles.otherMonthDayText,
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  
                  {dayEvents.length > 0 && (
                    <View style={styles.eventIndicator}>
                      <Text style={styles.eventCount}>{dayEvents.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            Events for {format(selectedDate, "MMMM d, yyyy")}
          </Text>
          
          {selectedDateEvents.length === 0 ? (
            <Text style={styles.noEvents}>No events for this date</Text>
          ) : (
            selectedDateEvents.map(event => (
              <View key={event.id} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                </Text>
                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendar: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    paddingVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: width / 7 - 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 8,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#6366f1',
  },
  todayDay: {
    backgroundColor: '#ddd6fe',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 16,
    color: '#111827',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  otherMonthDayText: {
    color: '#9ca3af',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCount: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventsSection: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noEvents: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  eventCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#374151',
  },
});