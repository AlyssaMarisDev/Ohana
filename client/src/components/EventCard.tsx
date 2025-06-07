import { EventWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User, Tag } from "lucide-react";

interface EventCardProps {
  event: EventWithDetails;
  showDate?: boolean;
  compact?: boolean;
}

const PREDEFINED_TAG_COLORS = {
  adults: '#ef4444',     // red
  family: '#3b82f6',     // blue
  work: '#6b7280',       // gray
  personal: '#10b981',   // green
  social: '#8b5cf6',     // purple
  medical: '#f97316',    // orange
};

const getEventColor = (event: EventWithDetails): string => {
  // Check for Google Calendar events
  if (typeof event.id === 'string' && (event.id as string).startsWith('google-')) {
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

export default function EventCard({ event, showDate = false, compact = false }: EventCardProps) {
  const eventColor = getEventColor(event);
  
  if (compact) {
    // Compact version for Today's Schedule (Dashboard)
    return (
      <div className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg">
        <div 
          className="w-1 h-12 rounded-full"
          style={{ backgroundColor: eventColor }}
        ></div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{event.title}</h3>
          <p className="text-sm text-gray-600">
            {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
          </p>
          {event.permissionTags && event.permissionTags.length > 0 && (
            <div className="flex items-center mt-2 space-x-2">
              {event.permissionTags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs rounded-md font-medium"
                  style={{ 
                    backgroundColor: eventColor + '20',
                    color: eventColor
                  }}
                >
                  {tag.tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full version for Day Events Modal
  return (
    <div
      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
      style={{ borderLeftColor: eventColor, borderLeftWidth: '4px' }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{event.title}</h3>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>
            {showDate && format(new Date(event.startTime), "MMM d, ")}
            {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
          </span>
        </div>
      </div>
      
      {event.description && (
        <p className="text-gray-700 mb-3">{event.description}</p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {event.assignee && (
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>Assigned to {event.assignee.firstName}</span>
          </div>
        )}
        
        {event.permissionTags && event.permissionTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <div className="flex gap-1">
              {event.permissionTags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  style={{ 
                    backgroundColor: eventColor + '20',
                    color: eventColor,
                    borderColor: eventColor + '40'
                  }}
                >
                  {tag.tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}