import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import EventCard from "./EventCard";

interface DayEventsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: EventWithDetails[];
}



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
              <EventCard 
                key={event.id} 
                event={event} 
                compact={false}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}