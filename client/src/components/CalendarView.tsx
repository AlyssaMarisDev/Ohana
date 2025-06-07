import { useMemo } from 'react';
import { Calendar, momentLocalizer, Views, Event as BigCalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { EventWithDetails } from '@shared/schema';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends BigCalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  resource?: EventWithDetails;
  permissionTags?: Array<{ tag: string }>;
  isGoogleEvent?: boolean;
}

interface CalendarViewProps {
  events: EventWithDetails[];
  onSelectEvent?: (event: EventWithDetails) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  view?: string;
  onView?: (view: string) => void;
  date?: Date;
  onNavigate?: (date: Date) => void;
  className?: string;
}

const PREDEFINED_TAG_COLORS = {
  adults: '#ef4444',     // red
  family: '#3b82f6',     // blue
  work: '#6b7280',       // gray
  personal: '#10b981',   // green
  social: '#8b5cf6',     // purple
  medical: '#f97316',    // orange
};

// Helper function to check if an event is from Google Calendar
const isGoogleEvent = (event: any): boolean => {
  return typeof event.id === 'string' && event.id.startsWith('google-');
};

// Get event color based on tags
const getEventColor = (event: EventWithDetails): string => {
  // Default color for Google events
  if (isGoogleEvent(event)) {
    return '#059669'; // emerald-600
  }

  // Color based on permission tags
  if (event.permissionTags && event.permissionTags.length > 0) {
    const firstTag = event.permissionTags[0].tag.toLowerCase();
    if (PREDEFINED_TAG_COLORS[firstTag as keyof typeof PREDEFINED_TAG_COLORS]) {
      return PREDEFINED_TAG_COLORS[firstTag as keyof typeof PREDEFINED_TAG_COLORS];
    }
  }

  // Default color
  return '#6366f1'; // indigo-500
};

export default function CalendarView({
  events,
  onSelectEvent,
  onSelectSlot,
  view = 'month',
  onView,
  date = new Date(),
  onNavigate,
  className = ''
}: CalendarViewProps) {
  // Transform events for React Big Calendar
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: event,
      permissionTags: event.permissionTags,
      isGoogleEvent: isGoogleEvent(event),
    }));
  }, [events]);

  // Custom event style getter
  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = getEventColor(event.resource!);
    const isGoogle = event.isGoogleEvent;
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        opacity: isGoogle ? 0.8 : 1,
        borderLeft: isGoogle ? '3px solid #059669' : 'none',
      }
    };
  };

  // Custom components for better styling
  const components = {
    toolbar: ({ label, onNavigate }: any) => (
      <div className="flex items-center justify-between py-3 px-4 border-b border-gray-200">
        <button
          onClick={() => onNavigate('PREV')}
          className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{label}</h2>
        <button
          onClick={() => onNavigate('NEXT')}
          className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    ),
    event: ({ event }: { event: CalendarEvent }) => (
      <div className="flex items-center h-full px-1">
        <span className="truncate text-xs">
          {event.isGoogleEvent && (
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-1 opacity-70"></span>
          )}
          {event.title}
        </span>
      </div>
    ),
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onSelectEvent && event.resource) {
      onSelectEvent(event.resource);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[]; action: string }) => {
    if (onSelectSlot) {
      onSelectSlot({
        start: slotInfo.start,
        end: slotInfo.end,
      });
    }
  };

  return (
    <div className={`calendar-container ${className}`}>
      <style>{`
        .rbc-calendar {
          font-family: inherit;
          background: white;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
        }
        
        .rbc-header {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }
        
        .rbc-month-view {
          border: none;
        }
        
        .rbc-date-cell {
          padding: 4px 8px 4px 8px;
          text-align: right;
          color: #374151;
        }
        
        .rbc-date-cell.rbc-off-range {
          color: #9ca3af;
          background: #f9fafb;
        }
        
        .rbc-today {
          background: #dbeafe;
        }
        
        .rbc-event {
          border-radius: 4px;
          padding: 2px 4px;
          margin: 4px 0 1px 0;
        }
        
        .rbc-event:first-of-type {
          margin-top: 4px;
        }
        
        .rbc-selected {
          background: #3b82f6 !important;
        }
        
        .rbc-toolbar {
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .rbc-toolbar .rbc-btn-group:first-child {
          order: 1;
        }
        
        .rbc-toolbar .rbc-toolbar-label {
          order: 2;
          flex: 1;
          text-align: center;
        }
        
        .rbc-toolbar .rbc-btn-group:last-child {
          order: 3;
        }
        
        .rbc-toolbar button {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 50%;
          padding: 8px;
          color: #374151;
          font-weight: 500;
          transition: all 0.2s;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .rbc-toolbar button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .rbc-toolbar button.rbc-active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }
        
        .rbc-btn-group button:first-child {
          border-radius: 50%;
        }
        
        .rbc-btn-group button:last-child {
          border-radius: 50%;
        }
        
        .rbc-btn-group button:not(:first-child):not(:last-child) {
          border-radius: 50%;
        }
        
        .rbc-toolbar-label {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        
        /* Hide navigation buttons from toolbar, we'll add custom ones */
        .rbc-toolbar .rbc-btn-group:first-child button {
          display: none;
        }
        
        .rbc-month-row {
          border-bottom: 1px solid #e5e7eb;
        }
        
        .rbc-day-bg {
          border-right: 1px solid #e5e7eb;
        }
        
        .rbc-day-bg:last-child {
          border-right: none;
        }
        
        .rbc-time-view {
          border: 1px solid #e5e7eb;
        }
        
        .rbc-time-header {
          border-bottom: 1px solid #e5e7eb;
        }
        
        .rbc-time-content {
          border-top: 1px solid #e5e7eb;
        }
        
        .rbc-timeslot-group {
          border-bottom: 1px solid #f3f4f6;
        }
        
        .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }
        
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
          z-index: 1;
        }
        
        .rbc-agenda-view {
          border: 1px solid #e5e7eb;
        }
        
        .rbc-agenda-view table {
          width: 100%;
        }
        
        .rbc-agenda-view .rbc-agenda-date-cell,
        .rbc-agenda-view .rbc-agenda-time-cell {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px;
          font-weight: 500;
        }
        
        .rbc-agenda-view .rbc-agenda-event-cell {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .rbc-show-more {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .rbc-show-more:hover {
          background: #e5e7eb;
        }
      `}</style>
      
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        view={view as any}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        date={date}
        onNavigate={onNavigate}
        onView={onView as any}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        components={components}
        step={30}
        showMultiDayTimes
        popup
        formats={{
          timeGutterFormat: 'h:mm A',
          eventTimeRangeFormat: ({ start, end }) => 
            `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
          agendaTimeFormat: 'h:mm A',
          agendaDateFormat: 'ddd MMM D',
        }}
        messages={{
          today: 'Today',
          previous: 'Back',
          next: 'Next',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          showMore: total => `+${total} more`,
          noEventsInRange: 'No events in this range.',
        }}
      />
    </div>
  );
}