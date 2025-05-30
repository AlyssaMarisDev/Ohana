import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateEventModal from "@/components/CreateEventModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventWithDetails, HouseholdWithMembers } from "@shared/schema";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateEvent, setShowCreateEvent] = useState(false);
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

  // Get events for selected date
  const selectedDateEvents = events?.filter(event => 
    isSameDay(new Date(event.startTime), selectedDate)
  ) || [];

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
    return events?.some(event => isSameDay(new Date(event.startTime), day)) || false;
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
                    <div key={event.id} className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg">
                      <div className="w-1 h-12 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                        </p>
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
        currentHousehold={currentHousehold}
        defaultDate={selectedDate}
      />
    </div>
  );
}
