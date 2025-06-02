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
import { Badge } from "@/components/ui/badge";
import type { EventWithDetails, HouseholdWithMembers } from "@shared/schema";

// Helper function to check if an event is from Google Calendar
const isGoogleEvent = (event: any): boolean => {
  return typeof event.id === 'string' && event.id.startsWith('google-');
};

// Predefined tag options for displaying full tag names
const PREDEFINED_TAGS = [
  { 
    name: "adults", 
    label: "Adults Only", 
    color: "bg-red-100 text-red-800"
  },
  { 
    name: "family", 
    label: "Family", 
    color: "bg-blue-100 text-blue-800"
  },
  { 
    name: "work", 
    label: "Work", 
    color: "bg-gray-100 text-gray-800"
  },
  { 
    name: "personal", 
    label: "Personal", 
    color: "bg-green-100 text-green-800"
  },
  { 
    name: "social", 
    label: "Social", 
    color: "bg-purple-100 text-purple-800"
  },
  { 
    name: "medical", 
    label: "Medical", 
    color: "bg-orange-100 text-orange-800"
  }
];

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
    staleTime: 60 * 1000, // 1 minute - data becomes stale after 1 minute
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  });

  // Events now include Google Calendar events merged by the backend
  const allEvents = events || [];

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

  // Get all events for a specific day (both single and multi-day events that occur on this day)
  const getEventsForDay = (day: Date) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    
    const dayEvents = allEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      
      // Include event if this day falls within the event's date range
      return dayStart >= eventStartDate && dayStart <= eventEndDate;
    });

    return dayEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  // Calculate how many days an event spans and if this is the start day
  const getEventDisplayInfo = (event: EventWithDetails, currentDay: Date) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
    const currentDayDate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
    
    const isStartDay = currentDayDate.getTime() === eventStartDate.getTime();
    const isEndDay = currentDayDate.getTime() === eventEndDate.getTime();
    const isSingleDay = eventStartDate.getTime() === eventEndDate.getTime();
    
    // Calculate how many days the event spans from current day
    let daysToSpan = 1; // Default to 1 day (current day)
    if (!isSingleDay && isStartDay) {
      const currentDayOfWeek = currentDay.getDay(); // 0 = Sunday, 6 = Saturday
      const daysUntilWeekEnd = 6 - currentDayOfWeek;
      
      const timeDiff = eventEndDate.getTime() - eventStartDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // Total days the event spans
      
      daysToSpan = Math.min(daysDiff, daysUntilWeekEnd + 1);
      
      // Debug logging
      console.log(`Event: ${event.title}, Start: ${eventStartDate.toDateString()}, End: ${eventEndDate.toDateString()}, Days to span: ${daysToSpan}`);
    }
    
    return {
      isStartDay,
      isEndDay,
      isSingleDay,
      daysToSpan,
      shouldDisplay: isStartDay || isSingleDay // Only display on start day for multi-day events
    };
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
        <div className="bg-white border-b border-gray-200 px-2 py-4">
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
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 py-3 border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 relative calendar-grid">
              {/* Day cells without events */}
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                const isToday_ = isToday(day);
                const dayEvents = getEventsForDay(day).filter(event => {
                  const displayInfo = getEventDisplayInfo(event, day);
                  return displayInfo.isSingleDay; // Only show single-day events in cells
                });
                const isWeekEnd = index % 7 === 6;
                const isLastRow = index >= days.length - 7;
                
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      flex flex-col p-2 transition-colors cursor-pointer calendar-day-cell
                      min-h-[110px] sm:min-h-[130px] h-[110px] sm:h-[130px]
                      ${!isWeekEnd ? 'border-r border-gray-200' : ''}
                      ${!isLastRow ? 'border-b border-gray-200' : ''}
                      ${isCurrentMonth ? 'text-gray-900 bg-white' : 'text-gray-400 bg-gray-50'}
                      ${isSelected ? 'bg-primary/5 ring-2 ring-primary ring-inset' : 'hover:bg-gray-50'}
                      ${isToday_ && !isSelected ? 'bg-blue-50' : ''}
                    `}
                    data-row={Math.floor(index / 7)}
                    data-col={index % 7}
                  >
                    <div className={`text-sm font-medium mb-2 ${isToday_ ? 'text-blue-600' : ''}`}>
                      {format(day, "d")}
                    </div>
                    
                    {/* Reserve space for multi-day events */}
                    <div style={{ height: '30px' }}></div>
                    
                    {/* Reserve space for single-day events - they'll be positioned absolutely */}
                    <div className="flex-1"></div>
                  </div>
                );
              })}
              
              {/* All events overlay */}
              {(() => {
                // Group all events by day and create unified event slots
                const eventsByDay = new Map();
                
                allEvents.forEach(event => {
                  const eventStart = new Date(event.startTime);
                  const eventEnd = new Date(event.endTime);
                  const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
                  const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
                  const isSingleDay = eventStartDate.getTime() === eventEndDate.getTime();
                  
                  if (isSingleDay) {
                    // Add to single day
                    const dateKey = eventStartDate.getTime();
                    if (!eventsByDay.has(dateKey)) {
                      eventsByDay.set(dateKey, []);
                    }
                    eventsByDay.get(dateKey).push({
                      ...event,
                      isSingleDay: true,
                      isStartDay: true,
                      spanCols: 1
                    });
                  } else {
                    // Add to start day (multi-day events only appear on start day)
                    const dateKey = eventStartDate.getTime();
                    if (!eventsByDay.has(dateKey)) {
                      eventsByDay.set(dateKey, []);
                    }
                    
                    // Calculate span columns
                    const startDayIndex = days.findIndex(day => {
                      const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                      return dayDate.getTime() === eventStartDate.getTime();
                    });
                    const endDayIndex = days.findIndex(day => {
                      const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                      return dayDate.getTime() === eventEndDate.getTime();
                    });
                    
                    if (startDayIndex !== -1) {
                      const actualEndIndex = endDayIndex === -1 ? days.length - 1 : endDayIndex;
                      const startRow = Math.floor(startDayIndex / 7);
                      const endRow = Math.floor(actualEndIndex / 7);
                      
                      // Only show if within same week
                      if (startRow === endRow) {
                        const startCol = startDayIndex % 7;
                        const endCol = actualEndIndex % 7;
                        const spanCols = endCol - startCol + 1;
                        
                        eventsByDay.get(dateKey).push({
                          ...event,
                          isSingleDay: false,
                          isStartDay: true,
                          spanCols
                        });
                      }
                    }
                  }
                });
                
                // Sort events within each day: multi-day first, then single-day by time
                eventsByDay.forEach(dayEvents => {
                  dayEvents.sort((a, b) => {
                    // Multi-day events come first
                    if (!a.isSingleDay && b.isSingleDay) return -1;
                    if (a.isSingleDay && !b.isSingleDay) return 1;
                    
                    // If both are same type, sort by start time
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                  });
                });
                
                const allEventElements = [];
                
                // Create proper visual hierarchy: multi-day events on top, then single-day events
                const globalEventPositions = new Map();
                
                // Collect all unique events and separate by type
                const allMultiDayEvents = [];
                const allSingleDayEvents = [];
                const seenEvents = new Set();
                
                eventsByDay.forEach((dayEvents) => {
                  dayEvents.forEach((event) => {
                    if (!seenEvents.has(event.id)) {
                      seenEvents.add(event.id);
                      if (event.isSingleDay) {
                        allSingleDayEvents.push(event);
                      } else {
                        allMultiDayEvents.push(event);
                      }
                    }
                  });
                });
                
                // Sort multi-day events by start time
                allMultiDayEvents.sort((a, b) => {
                  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                });
                
                // Sort single-day events by start time  
                allSingleDayEvents.sort((a, b) => {
                  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                });
                
                // Assign positions: multi-day events first (0, 1, 2...), then single-day events
                let positionIndex = 0;
                allMultiDayEvents.forEach((event) => {
                  globalEventPositions.set(event.id, positionIndex++);
                });
                allSingleDayEvents.forEach((event) => {
                  globalEventPositions.set(event.id, positionIndex++);
                });

                // Render all events with unified spacing and overflow handling
                eventsByDay.forEach((dayEvents, dateKey) => {
                  const eventStartDate = new Date(dateKey);
                  const startDayIndex = days.findIndex(day => {
                    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    return dayDate.getTime() === eventStartDate.getTime();
                  });
                  
                  if (startDayIndex === -1) return; // Event not in current month view
                  
                  const startRow = Math.floor(startDayIndex / 7);
                  const startCol = startDayIndex % 7;
                  
                  // Determine max events based on screen size
                  const maxEventsLarge = 3;
                  const maxEventsSmall = 2;
                  const isLargeScreen = window.innerWidth >= 640;
                  const maxEvents = isLargeScreen ? maxEventsLarge : maxEventsSmall;
                  
                  // For overflow calculation, we need to consider all events that will be visible in this day
                  // Multi-day events are always shown, so they take up slots
                  const multiDayEventsInThisDay = dayEvents.filter(event => !event.isSingleDay);
                  const singleDayEventsInThisDay = dayEvents.filter(event => event.isSingleDay);
                  
                  // Calculate how many events we can actually show
                  const multiDayCount = multiDayEventsInThisDay.length;
                  const availableSlotsForSingleDay = Math.max(0, maxEvents - multiDayCount);
                  const singleDayEventsToShow = Math.min(singleDayEventsInThisDay.length, availableSlotsForSingleDay);
                  
                  // Total events to show and remaining count
                  const eventsToShow = multiDayCount + singleDayEventsToShow;
                  const totalEvents = dayEvents.length;
                  const remainingEvents = totalEvents - eventsToShow;
                  
                  dayEvents.slice(0, eventsToShow).forEach((event, localIndex) => {
                    // Use global position for multi-day events to maintain consistency across days
                    // For single-day events, position them after all multi-day events in the day
                    let eventIndex;
                    if (!event.isSingleDay) {
                      // Multi-day events: use global position for consistency
                      eventIndex = globalEventPositions.get(event.id);
                    } else {
                      // Single-day events: position after all multi-day events in this day
                      const multiDayEventsInThisDay = dayEvents.filter(e => !e.isSingleDay);
                      const maxMultiDayPosition = multiDayEventsInThisDay.length > 0 
                        ? Math.max(...multiDayEventsInThisDay.map(e => globalEventPositions.get(e.id))) + 1
                        : 0;
                      const singleDayEventsInDay = dayEvents.filter(e => e.isSingleDay);
                      const singleDayIndex = singleDayEventsInDay.findIndex(e => e.id === event.id);
                      eventIndex = maxMultiDayPosition + singleDayIndex;
                    }
                    const eventStart = new Date(event.startTime);
                    const isAllDay = eventStart.getHours() === 0 && eventStart.getMinutes() === 0;
                    const primaryTag = event.permissionTags?.[0];
                    const tagInfo = primaryTag ? PREDEFINED_TAGS.find(t => t.name === primaryTag.tag) : null;
                    
                    const eventColor = tagInfo?.color?.includes('red') ? '#ef4444' :
                      tagInfo?.color?.includes('blue') ? '#3b82f6' :
                      tagInfo?.color?.includes('green') ? '#10b981' :
                      tagInfo?.color?.includes('purple') ? '#8b5cf6' :
                      tagInfo?.color?.includes('orange') ? '#f97316' :
                      '#6b7280';

                    allEventElements.push(
                      <div
                        key={`event-${event.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                        }}
                        className={`
                          absolute text-xs py-1 font-medium cursor-pointer leading-tight rounded z-10
                          hover:opacity-80 transition-opacity
                          ${event.isSingleDay 
                            ? 'text-gray-900 bg-transparent px-1' 
                            : 'text-white px-2'
                          }
                        `}
                        style={{
                          position: 'absolute',
                          left: event.isSingleDay 
                            ? `${(startCol / 7) * 100 + 0.25}%`  // Small left margin for single-day events
                            : `${(startCol / 7) * 100}%`,        // Edge-to-edge for multi-day events
                          width: event.isSingleDay 
                            ? `${(event.spanCols / 7) * 100 - 0.5}%`  // Reduce width to account for margin
                            : `${(event.spanCols / 7) * 100}%`,       // Full width for multi-day events
                          top: `calc(${startRow * (100 / Math.ceil(days.length / 7))}% + 30px + ${eventIndex * 25}px)`,
                          height: '22px',
                          backgroundColor: event.isSingleDay ? 'transparent' : eventColor,
                          borderLeft: event.isSingleDay ? `4px solid ${eventColor}` : 'none'
                        }}
                        title={event.isSingleDay 
                          ? `${event.title} - ${format(eventStart, isAllDay ? 'MMM d' : 'h:mm a')}`
                          : `${event.title} - ${format(eventStart, isAllDay ? 'MMM d' : 'h:mm a')} to ${format(new Date(event.endTime), 'MMM d h:mm a')}`
                        }
                      >
                        <div className="truncate">
                          {event.title}
                        </div>
                      </div>
                    );
                  });
                  
                  // Add "+X more" indicator if there are remaining events
                  if (remainingEvents > 0) {
                    allEventElements.push(
                      <div
                        key={`more-events-${dateKey}`}
                        className="absolute text-xs text-gray-600 font-medium cursor-pointer hover:text-gray-800"
                        style={{
                          position: 'absolute',
                          left: `${(startCol / 7) * 100 + 0.25}%`,
                          width: `${(1 / 7) * 100 - 0.5}%`,
                          top: `calc(${startRow * (100 / Math.ceil(days.length / 7))}% + 30px + ${eventsToShow * 25}px)`,
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '6px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(eventStartDate);
                        }}
                      >
                        +{remainingEvents} more
                      </div>
                    );
                  }
                });
                
                return allEventElements;
              })()}
            </div>
          </div>
        </div>
        
        {/* Selected Day Events */}
        <div className="px-2 py-4">
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
                      onClick={() => {
                        if (!isGoogleEvent(event)) {
                          setEditingEvent(event as EventWithDetails);
                        }
                      }}
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
                                  <div>{startLabel} {startTimeFormatted} -</div>
                                  <div>{endLabel} {endTimeFormatted}</div>
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
                        <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                          {event.category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                              {event.category}
                            </span>
                          )}
                          {event.permissionTags && event.permissionTags.length > 0 && (
                            <>
                              {event.permissionTags.slice(0, 3).map((tag, index) => {
                                const tagInfo = PREDEFINED_TAGS.find(t => t.name === tag.tag);
                                return (
                                  <Badge 
                                    key={index} 
                                    className={`text-xs ${tagInfo?.color || 'bg-gray-100 text-gray-800'}`}
                                  >
                                    {tagInfo?.label || tag.tag}
                                  </Badge>
                                );
                              })}
                              {event.permissionTags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{event.permissionTags.length - 3}
                                </Badge>
                              )}
                            </>
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
