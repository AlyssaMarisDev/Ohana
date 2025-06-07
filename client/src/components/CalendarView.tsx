import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventWithDetails } from '@shared/schema';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    resource: EventWithDetails;
    isGoogleEvent: boolean;
  };
}

interface CalendarViewProps {
  events: EventWithDetails[];
  onSelectEvent?: (event: EventWithDetails) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; events?: EventWithDetails[] }) => void;
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

  // Check for predefined tag colors
  if (event.permissionTags && event.permissionTags.length > 0) {
    const firstTag = event.permissionTags[0].tag.toLowerCase();
    if (firstTag in PREDEFINED_TAG_COLORS) {
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
  // Transform events for FullCalendar
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return events.map(event => {
      const eventColor = getEventColor(event);
      return {
        id: event.id.toString(),
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        backgroundColor: eventColor,
        borderColor: eventColor,
        extendedProps: {
          resource: event,
          isGoogleEvent: isGoogleEvent(event),
        },
      };
    });
  }, [events]);

  // Handle day cell clicks
  const handleDateClick = (arg: any) => {
    // Use the date string and create a proper local date
    const clickedDate = new Date(arg.dateStr + 'T00:00:00');
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      // Compare dates in the same timezone
      const eventDateStr = eventDate.getFullYear() + '-' + 
        String(eventDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(eventDate.getDate()).padStart(2, '0');
      return eventDateStr === arg.dateStr;
    });
    
    if (onSelectSlot) {
      onSelectSlot({
        start: clickedDate,
        end: new Date(clickedDate.getTime() + 24 * 60 * 60 * 1000),
        events: dayEvents
      });
    }
  };

  // Handle event clicks - prevent individual event clicks, redirect to day click
  const handleEventClick = (arg: any) => {
    // Prevent individual event selection, instead trigger day click
    arg.jsEvent.preventDefault();
    arg.jsEvent.stopPropagation();
    
    // Get the date from the event and trigger day click
    const eventDate = new Date(arg.event.start);
    const dateStr = eventDate.getFullYear() + '-' + 
      String(eventDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(eventDate.getDate()).padStart(2, '0');
    
    const dayEvents = events.filter(event => {
      const eventEventDate = new Date(event.startTime);
      const eventDateStr = eventEventDate.getFullYear() + '-' + 
        String(eventEventDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(eventEventDate.getDate()).padStart(2, '0');
      return eventDateStr === dateStr;
    });
    
    if (onSelectSlot) {
      onSelectSlot({
        start: new Date(dateStr + 'T00:00:00'),
        end: new Date(dateStr + 'T23:59:59'),
        events: dayEvents
      });
    }
  };

  return (
    <div className={`fullcalendar-container ${className}`}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev',
          center: 'title',
          right: 'next'
        }}
        height="auto"
        dayMaxEvents={4}
        moreLinkClick="popover"
        eventDisplay="block"
        displayEventTime={false}
        dayHeaderFormat={{ weekday: 'short' }}
        titleFormat={{ year: 'numeric', month: 'long' }}
        aspectRatio={1.35}
        eventClassNames={(arg) => {
          const isGoogle = arg.event.extendedProps?.isGoogleEvent;
          return isGoogle ? 'google-event' : 'regular-event';
        }}
        initialDate={date}
        datesSet={(arg) => {
          if (onNavigate) {
            onNavigate(arg.start);
          }
        }}
      />
      
      <style>{`
        .fullcalendar-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        }
        
        .fc {
          font-family: inherit;
        }
        
        .fc-header-toolbar {
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 0 !important;
        }
        
        .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }
        
        .fc-button {
          background: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 50% !important;
          color: #374151 !important;
          font-weight: 500;
          transition: all 0.2s;
          width: 40px !important;
          height: 40px !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 4px !important;
        }
        
        .fc-button:hover {
          background: #f3f4f6 !important;
          border-color: #9ca3af !important;
        }
        
        .fc-button:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px #3b82f6 !important;
        }
        
        .fc-button:disabled {
          opacity: 0.5;
        }
        
        .fc-prev-button::before {
          content: '‹';
          font-size: 20px;
          font-weight: bold;
        }
        
        .fc-next-button::before {
          content: '›';
          font-size: 20px;
          font-weight: bold;
        }
        
        .fc-button-primary {
          font-size: 0;
        }
        
        .fc-daygrid-day {
          cursor: pointer;
          min-height: 120px;
          transition: background-color 0.1s ease;
          touch-action: manipulation;
        }
        
        .fc-daygrid-day:hover {
          background-color: #f8fafc;
        }
        
        .fc-daygrid-day-number {
          padding: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          text-align: center;
          text-decoration: none;
        }
        
        .fc-day-today {
          background-color: #dbeafe !important;
        }
        
        .fc-day-today .fc-daygrid-day-number {
          color: #1d4ed8;
          font-weight: 700;
        }
        
        .fc-day-other .fc-daygrid-day-number {
          color: #9ca3af;
        }
        
        .fc-col-header-cell {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          text-align: center;
        }
        
        .fc-event {
          border: none !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          color: white !important;
          padding: 2px 6px !important;
          margin: 1px 2px !important;
          height: 20px !important;
          line-height: 16px !important;
          cursor: pointer;
          pointer-events: none;
        }
        
        .fc-daygrid-day-frame {
          position: relative;
          z-index: 1;
        }
        
        .fc-daygrid-day-events {
          pointer-events: none;
        }
        
        .fc-event:hover {
          opacity: 0.9;
        }
        
        .fc-event-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .google-event {
          opacity: 0.85;
          position: relative;
        }
        
        .google-event::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #059669;
          border-radius: 4px 0 0 4px;
        }
        
        .fc-more-link {
          background: #f3f4f6 !important;
          color: #374151 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          margin: 1px 2px !important;
          display: inline-block;
        }
        
        .fc-more-link:hover {
          background: #e5e7eb !important;
        }
        
        .fc-daygrid-event-harness {
          margin-bottom: 1px;
        }
        
        .fc-daygrid-more-link {
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .fc-daygrid-day {
            min-height: 80px;
          }
          
          .fc-event {
            font-size: 10px !important;
            height: 18px !important;
            line-height: 14px !important;
          }
          
          .fc-daygrid-day-number {
            font-size: 12px;
            padding: 4px;
          }
          
          .fc-header-toolbar {
            padding: 12px 16px;
          }
          
          .fc-toolbar-title {
            font-size: 1.1rem;
          }
          
          .fc-button {
            width: 36px !important;
            height: 36px !important;
          }
        }
      `}</style>
    </div>
  );
}