import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateEventModal from "@/components/CreateEventModal";
import EditEventModal from "@/components/EditEventModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventWithDetails, HouseholdWithMembers } from "@shared/schema";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | null>(null);

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
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
  });

  // Fetch Google Calendar events
  const { data: googleEvents, isLoading: googleEventsLoading } = useQuery<any[]>({
    queryKey: ["/api/google/events", { 
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd")
    }],
    enabled: true,
  });

  // Convert Google Calendar events to our format and combine with app events
  const convertedGoogleEvents = googleEvents?.map(event => ({
    id: `google-${event.id}`,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startTime: new Date(event.start?.dateTime || event.start?.date),
    endTime: new Date(event.end?.dateTime || event.end?.date),
    category: null,
    tags: null,
    createdAt: null,
    updatedAt: null,
    createdBy: 'google',
    householdId: null,
    assignedTo: null,
    visibility: 'public',
    creator: { id: 'google', firstName: 'Google', lastName: 'Calendar', email: null, profileImageUrl: null, createdAt: null, updatedAt: null, googleAccessToken: null, googleRefreshToken: null, googleCalendarSyncEnabled: null },
    assignee: undefined,
    household: undefined,
    source: 'google'
  })) || [];

  // Combine app events and Google Calendar events
  const allEvents = [...(events || []), ...convertedGoogleEvents];

  // Get events for selected date (including multi-day events)
  const selectedDateEvents = allEvents.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
    
    // Check if the selected date falls within the event's timespan
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

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const hasEventsOnDay = (day: Date) => {
    return allEvents.some(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      
      // Check if this day falls within the event's timespan
      return dayStart >= eventStartDate && dayStart <= eventEndDate;
    });
  };

  const days = getDaysInMonth();

  if (householdsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <AppHeader currentHousehold={null} onHouseholdChange={() => {}} />
        <div className="p-4">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="safe-area-top bg-primary"></div>
      
      <AppHeader 
        currentHousehold={currentHousehold || null} 
        onHouseholdChange={setCurrentHouseholdId}
      />
      
      <main className="flex-1 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <h2 className="font-semibold text-xl text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
            
            {days.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const isToday_ = isToday(day);
              const hasEvents = hasEventsOnDay(day);
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square flex flex-col items-center justify-center p-1 rounded-lg transition-colors relative
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100'}
                    ${isToday_ && !isSelected ? 'bg-blue-50 text-blue-600 font-semibold' : ''}
                  `}
                >
                  <span className="text-sm">{format(day, "d")}</span>
                  {hasEvents && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Selected Day Events */}
        <div className="p-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Events for {format(selectedDate, "MMMM d, yyyy")}
                </CardTitle>
                <Button
                  onClick={() => setShowCreateEvent(true)}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="w-1 h-12 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const startTime = new Date(event.startTime);
                            const endTime = new Date(event.endTime);
                            const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
                            const startDateStr = format(startTime, "yyyy-MM-dd");
                            const endDateStr = format(endTime, "yyyy-MM-dd");
                            
                            const startTimeFormatted = format(startTime, "h:mm a");
                            const endTimeFormatted = format(endTime, "h:mm a");
                            
                            // Helper function to get relative date label
                            const getRelativeDate = (dateStr, referenceStr) => {
                              const date = new Date(dateStr);
                              const reference = new Date(referenceStr);
                              const diffDays = Math.round((date - reference) / (1000 * 60 * 60 * 24));
                              
                              if (diffDays === 0) return "Today";
                              if (diffDays === 1) return "Tomorrow";
                              if (diffDays === -1) return "Yesterday";
                              return format(date, "MMM d");
                            };
                            
                            // If it's a multi-day event, show start and end on separate lines
                            if (startDateStr !== endDateStr) {
                              const startLabel = getRelativeDate(startDateStr, selectedDateStr);
                              const endLabel = getRelativeDate(endDateStr, selectedDateStr);
                              
                              return (
                                <div>
                                  <div>Start: {startLabel} {startTimeFormatted}</div>
                                  <div>End: {endLabel} {endTimeFormatted}</div>
                                </div>
                              );
                            }
                            
                            // Single day event
                            return `${startTimeFormatted} - ${endTimeFormatted}`;
                          })()}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center mt-2 space-x-2">
                          {event.category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                              {event.category}
                            </span>
                          )}
                          {event.assignee && (
                            <span className="text-xs text-gray-600">
                              {event.assignee.firstName || event.assignee.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No events scheduled for this day</p>
                  <Button
                    onClick={() => setShowCreateEvent(true)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Create Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />

      <CreateEventModal 
        open={showCreateEvent} 
        onOpenChange={setShowCreateEvent}
        currentHousehold={currentHousehold || null}
        defaultDate={selectedDate}
      />

      {editingEvent && (
        <EditEventModal
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          event={editingEvent}
          currentHousehold={currentHousehold || null}
        />
      )}
    </div>
  );
}
