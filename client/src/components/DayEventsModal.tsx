import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, Clock, User, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DayEventsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: EventWithDetails[];
}

const PREDEFINED_TAG_COLORS = {
  adults: '#ef4444',     // red
  family: '#3b82f6',     // blue
  kids: '#22c55e',       // green
  personal: '#f59e0b',   // amber
  work: '#8b5cf6',       // violet
  health: '#ec4899',     // pink
  social: '#06b6d4',     // cyan
  home: '#84cc16',       // lime
};

const getEventColor = (event: EventWithDetails): string => {
  if (event.permissionTags && event.permissionTags.length > 0) {
    const firstTag = event.permissionTags[0].tag.toLowerCase();
    return PREDEFINED_TAG_COLORS[firstTag as keyof typeof PREDEFINED_TAG_COLORS] || '#6b7280';
  }
  return '#6b7280';
};

export default function DayEventsModal({ open, onOpenChange, date, events }: DayEventsModalProps) {
  if (!date) return null;

  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Events for {format(date, "MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No events scheduled for this day</p>
            </div>
          ) : (
            sortedEvents.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                style={{ borderLeftColor: getEventColor(event), borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
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
                              backgroundColor: getEventColor(event) + '20',
                              color: getEventColor(event),
                              borderColor: getEventColor(event) + '40'
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
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}