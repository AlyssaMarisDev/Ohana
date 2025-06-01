import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Users, Tag, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { insertEventSchema } from "@shared/schema";
import type { EventWithDetails, HouseholdWithMembers, User } from "@shared/schema";

// Predefined tag options for event categorization
const PREDEFINED_TAGS = [
  { 
    name: "adults", 
    label: "Adults Only", 
    description: "Events not suitable for children",
    color: "bg-red-100 text-red-800"
  },
  { 
    name: "family", 
    label: "Family", 
    description: "Family-friendly events",
    color: "bg-blue-100 text-blue-800"
  },
  { 
    name: "work", 
    label: "Work", 
    description: "Professional and work events",
    color: "bg-gray-100 text-gray-800"
  },
  { 
    name: "personal", 
    label: "Personal", 
    description: "Personal appointments and activities",
    color: "bg-green-100 text-green-800"
  },
  { 
    name: "social", 
    label: "Social", 
    description: "Social gatherings and events",
    color: "bg-purple-100 text-purple-800"
  },
  { 
    name: "medical", 
    label: "Medical", 
    description: "Health and medical appointments",
    color: "bg-orange-100 text-orange-800"
  }
];

const formSchema = insertEventSchema.extend({
  startTime: z.date(),
  endTime: z.date(),
  eventTags: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventWithDetails;
  currentHousehold: HouseholdWithMembers | null;
}

export default function EditEventModal({
  open,
  onOpenChange,
  event,
  currentHousehold,
}: EditEventModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: households = [] } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event.title,
      description: event.description || "",
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      assignedTo: event.assignedTo || "",
      householdId: event.householdId,
      eventTags: event.permissionTags?.map(tag => tag.tag) || [],
    },
  });

  // Helper functions for tag management
  const addTag = (tagName: string) => {
    const currentTags = form.getValues("eventTags");
    
    if (!currentTags.includes(tagName)) {
      form.setValue("eventTags", [...currentTags, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    const currentTags = form.getValues("eventTags");
    form.setValue("eventTags", currentTags.filter(t => t !== tagName));
  };

  const updateEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const processedData = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        assignedTo: data.assignedTo || null,
        eventTags: data.eventTags,
      };
      return apiRequest("PATCH", `/api/events/${event.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      onOpenChange(false);
      toast({
        title: "Event updated",
        description: "Your event has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Event update error:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      onOpenChange(false);
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Event deletion error:", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    
    if (data.endTime <= data.startTime) {
      toast({
        title: "Invalid time",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }
    updateEventMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Edit Event
          </DialogTitle>
          <DialogDescription>
            Update the details of your event.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter event description" 
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date & Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP p")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              const currentTime = field.value || new Date();
                              newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                              field.onChange(newDate);
                            }
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Label htmlFor="start-time">Time</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                              if (field.value && e.target.value) {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                field.onChange(newDate);
                              }
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date & Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP p")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              const currentTime = field.value || new Date();
                              newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                              field.onChange(newDate);
                            }
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Label htmlFor="end-time">Time</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                              if (field.value && e.target.value) {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                field.onChange(newDate);
                              }
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Event Tags */}
            <FormField
              control={form.control}
              name="eventTags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Event Tags
                  </FormLabel>
                  <div className="space-y-3">
                    {/* Selected Tags Display */}
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((tagName, index) => {
                          const tagInfo = PREDEFINED_TAGS.find(t => t.name === tagName);
                          return (
                            <Badge 
                              key={index}
                              className={`flex items-center gap-1 pr-1 ${tagInfo?.color || 'bg-gray-100 text-gray-800'}`}
                            >
                              <span>{tagInfo?.label || tagName}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 hover:bg-transparent"
                                onClick={() => removeTag(tagName)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Add Tags Interface */}
                    <Popover open={showTagDropdown} onOpenChange={setShowTagDropdown}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 space-y-2">
                          <h4 className="font-medium text-sm mb-2">Select Event Tags</h4>
                          {PREDEFINED_TAGS.map((tag) => {
                            const isSelected = field.value.includes(tag.name);
                            
                            return (
                              <div 
                                key={tag.name}
                                className={`border rounded-lg p-3 cursor-pointer ${
                                  isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    removeTag(tag.name);
                                  } else {
                                    addTag(tag.name);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium text-sm px-2 py-1 rounded ${tag.color}`}>
                                        {tag.label}
                                      </span>
                                      {isSelected && (
                                        <Badge variant="secondary" className="text-xs">
                                          Selected
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{tag.description}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <p className="text-xs text-gray-600">
                      Event tags help categorize events. User permissions to view these tags are managed in their profile settings.
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="householdId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Household</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select household" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {households.map((household) => (
                        <SelectItem key={household.id} value={household.id.toString()}>
                          {household.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)} value={field.value || "unassigned"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {currentHousehold?.memberships.map((membership) => (
                        <SelectItem key={membership.user.id} value={membership.user.id}>
                          {membership.user.firstName || membership.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEventMutation.isPending}
              >
                {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updateEventMutation.isPending}
                  onClick={() => {
                    console.log("Button clicked!");
                    const formData = form.getValues();
                    console.log("Form data:", formData);
                    onSubmit(formData);
                  }}
                >
                  {updateEventMutation.isPending ? "Updating..." : "Update Event"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}