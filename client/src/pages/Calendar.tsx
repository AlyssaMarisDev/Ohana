import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateEventModal from "@/components/CreateEventModal";
import EditEventModal from "@/components/EditEventModal";
import CalendarView from "@/components/CalendarView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventWithDetails, HouseholdWithMembers } from "@shared/schema";

// Helper function to check if an event is from Google Calendar
const isGoogleEvent = (event: any): boolean => {
  return typeof event.id === 'string' && event.id.startsWith('google-');
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | null>(null);

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  const currentHousehold = households?.find(h => h.id === currentHouseholdId) || households?.[0];

  // Fetch events for the current month/view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: events, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events", { 
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
      householdId: currentHousehold?.id 
    }],
    enabled: !!currentHousehold,
    staleTime: 60 * 1000, // 1 minute - data becomes stale after 1 minute
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  });

  const allEvents = events || [];

  const handleSelectEvent = (event: EventWithDetails) => {
    if (!isGoogleEvent(event)) {
      setEditingEvent(event);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // Open create event modal with pre-filled date/time
    setShowCreateEvent(true);
  };

  const handleHouseholdChange = (householdId: number | "all") => {
    if (householdId === "all") {
      setCurrentHouseholdId(null);
    } else {
      setCurrentHouseholdId(householdId);
    }
  };

  if (householdsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <AppHeader currentHousehold={null} onHouseholdChange={() => {}} />
        <div className="p-4">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-96 w-full mb-4" />
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
        onHouseholdChange={handleHouseholdChange}
      />
      
      <main className="flex-1 p-4">
        {/* Calendar Controls */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <Button
            onClick={() => setShowCreateEvent(true)}
            className="bg-primary hover:bg-primary/90 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Calendar Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-96">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <CalendarView
              events={allEvents}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              view={calendarView}
              onView={setCalendarView}
              date={currentDate}
              onNavigate={setCurrentDate}
              className="h-96 md:h-[600px]"
            />
          )}
        </div>

        {/* Event Legend */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Event Types</h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-emerald-600 mr-2"></div>
              <span className="text-gray-600">Google Calendar</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-red-500 mr-2"></div>
              <span className="text-gray-600">Adults Only</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-blue-500 mr-2"></div>
              <span className="text-gray-600">Family</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-green-500 mr-2"></div>
              <span className="text-gray-600">Personal</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-purple-500 mr-2"></div>
              <span className="text-gray-600">Social</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-orange-500 mr-2"></div>
              <span className="text-gray-600">Medical</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded bg-gray-500 mr-2"></div>
              <span className="text-gray-600">Work</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateEventModal
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        currentHousehold={currentHousehold || null}
      />

      {editingEvent && (
        <EditEventModal
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          event={editingEvent}
          currentHousehold={currentHousehold || null}
        />
      )}

      <BottomNavigation />
    </div>
  );
}