import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, Tag, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { HouseholdWithMembers } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.date({
    required_error: "Start time is required",
  }),
  endTime: z.date({
    required_error: "End time is required",
  }),
  category: z.string().optional(),
  tags: z.string().optional(),
  assignedTo: z.string().optional(),
  householdId: z.number().optional(),
  eventTags: z.array(z.object({
    tag: z.string(),
    permission: z.enum(["view", "edit", "suggest"]),
  })).default([]),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type FormData = z.infer<typeof formSchema>;

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHousehold: HouseholdWithMembers | null;
  defaultDate?: Date;
}

// Predefined tag options with descriptions
const PREDEFINED_TAGS = [
  { 
    name: "metamours", 
    label: "Metamours", 
    description: "Events involving partner's other partners",
    defaultPermission: "suggest" as const
  },
  { 
    name: "friends", 
    label: "Friends", 
    description: "Social events with friends",
    defaultPermission: "edit" as const
  },
  { 
    name: "family", 
    label: "Family", 
    description: "Family-related events",
    defaultPermission: "edit" as const
  },
  { 
    name: "work", 
    label: "Work", 
    description: "Professional and work events",
    defaultPermission: "view" as const
  },
  { 
    name: "personal", 
    label: "Personal", 
    description: "Private personal events",
    defaultPermission: "view" as const
  },
  { 
    name: "private", 
    label: "Private", 
    description: "Completely private events",
    defaultPermission: "view" as const
  }
];

export default function CreateEventModal({
  open,
  onOpenChange,
  currentHousehold,
  defaultDate,
}: CreateEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const getDefaultEndTime = () => {
    const start = defaultDate || new Date();
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return end;
  };

  const { data: households = [] } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  // Get default household - current household or personal household if viewing "All"
  const getDefaultHousehold = () => {
    if (currentHousehold) {
      return currentHousehold.id;
    }
    // If viewing "All", default to Personal household
    const personalHousehold = households.find(h => h.name === "Personal");
    return personalHousehold?.id;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: defaultDate || new Date(),
      endTime: getDefaultEndTime(),
      category: "",
      tags: "",
      assignedTo: "",
      householdId: getDefaultHousehold(),
      eventTags: [],
    },
  });

  // Helper functions for tag management
  const addTag = (tagName: string, permission: "view" | "edit" | "suggest") => {
    const currentTags = form.getValues("eventTags");
    const existingTag = currentTags.find(t => t.tag === tagName);
    
    if (!existingTag) {
      form.setValue("eventTags", [...currentTags, { tag: tagName, permission }]);
    }
  };

  const removeTag = (tagName: string) => {
    const currentTags = form.getValues("eventTags");
    form.setValue("eventTags", currentTags.filter(t => t.tag !== tagName));
  };

  const updateTagPermission = (tagName: string, permission: "view" | "edit" | "suggest") => {
    const currentTags = form.getValues("eventTags");
    const updatedTags = currentTags.map(t => 
      t.tag === tagName ? { ...t, permission } : t
    );
    form.setValue("eventTags", updatedTags);
  };

  // Track the duration between start and end times
  const [lastStartTime, setLastStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60 * 60 * 1000); // Default 1 hour

  // Watch for start time changes to auto-update end time
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  useEffect(() => {
    if (startTime && endTime) {
      // Update duration when end time changes
      const currentDuration = endTime.getTime() - startTime.getTime();
      if (currentDuration > 0) {
        setDuration(currentDuration);
      }
    }
  }, [endTime]);

  useEffect(() => {
    if (startTime && lastStartTime && startTime.getTime() !== lastStartTime.getTime()) {
      // Start time changed, update end time maintaining the duration
      const newEndTime = new Date(startTime.getTime() + duration);
      form.setValue("endTime", newEndTime);
    }
    setLastStartTime(startTime);
  }, [startTime, duration]);

  // Update household when households data changes or currentHousehold changes
  useEffect(() => {
    const defaultHousehold = getDefaultHousehold();
    if (defaultHousehold && defaultHousehold !== form.getValues("householdId")) {
      form.setValue("householdId", defaultHousehold);
    }
  }, [households, currentHousehold]);

  const createEventMutation = useMutation({
    mutationFn: (data: FormData) => {
      const processedData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
        createdBy: user?.id,
        visibility: "household",
        assignedTo: data.assignedTo || null, // Convert empty string to null
        eventTags: data.eventTags || [], // Include the new permission tags
      };
      return apiRequest("POST", "/api/events", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      form.reset();
      onOpenChange(false);
      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Event creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createEventMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
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
                      placeholder="Event description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Time</FormLabel>
                    <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="text-xs">
                                  {format(field.value, "MMM d")}
                                </span>
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {format(field.value, "HH:mm")}
                                </span>
                              </div>
                            ) : (
                              <span>Pick start time</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 space-y-3">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (field.value) {
                                  newDate.setHours(field.value.getHours());
                                  newDate.setMinutes(field.value.getMinutes());
                                }
                                field.onChange(newDate);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={
                                field.value
                                  ? format(field.value, "HH:mm")
                                  : ""
                              }
                              onChange={(e) => {
                                if (field.value && e.target.value) {
                                  const [hours, minutes] = e.target.value.split(":");
                                  const newDate = new Date(field.value);
                                  newDate.setHours(parseInt(hours));
                                  newDate.setMinutes(parseInt(minutes));
                                  field.onChange(newDate);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowStartCalendar(false)}
                            >
                              Done
                            </Button>
                          </div>
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
                    <FormLabel>End Time</FormLabel>
                    <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="text-xs">
                                  {format(field.value, "MMM d")}
                                </span>
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {format(field.value, "HH:mm")}
                                </span>
                              </div>
                            ) : (
                              <span>Pick end time</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 space-y-3">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (field.value) {
                                  newDate.setHours(field.value.getHours());
                                  newDate.setMinutes(field.value.getMinutes());
                                }
                                field.onChange(newDate);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={
                                field.value
                                  ? format(field.value, "HH:mm")
                                  : ""
                              }
                              onChange={(e) => {
                                if (field.value && e.target.value) {
                                  const [hours, minutes] = e.target.value.split(":");
                                  const newDate = new Date(field.value);
                                  newDate.setHours(parseInt(hours));
                                  newDate.setMinutes(parseInt(minutes));
                                  field.onChange(newDate);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowEndCalendar(false)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="work, meeting, important (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permission-based Tag Management */}
            <FormField
              control={form.control}
              name="eventTags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Permission Tags
                  </FormLabel>
                  <div className="space-y-3">
                    {/* Selected Tags Display */}
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((eventTag, index) => (
                          <Badge 
                            key={index}
                            variant="secondary" 
                            className="flex items-center gap-1 pr-1"
                          >
                            <span>{PREDEFINED_TAGS.find(t => t.name === eventTag.tag)?.label || eventTag.tag}</span>
                            <span className="text-xs opacity-70">({eventTag.permission})</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 hover:bg-transparent"
                              onClick={() => removeTag(eventTag.tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
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
                          Add Permission Tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 space-y-2">
                          <h4 className="font-medium text-sm mb-2">Select Tag & Permission</h4>
                          {PREDEFINED_TAGS.map((tag) => {
                            const isSelected = field.value.some(t => t.tag === tag.name);
                            const currentTag = field.value.find(t => t.tag === tag.name);
                            
                            return (
                              <div 
                                key={tag.name}
                                className={`border rounded-lg p-3 space-y-2 ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{tag.label}</span>
                                      {isSelected && (
                                        <Badge variant="secondary" className="text-xs">
                                          Selected
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{tag.description}</p>
                                  </div>
                                </div>
                                
                                {!isSelected ? (
                                  <div className="flex gap-1">
                                    {["view", "suggest", "edit"].map((permission) => (
                                      <Button
                                        key={permission}
                                        type="button"
                                        variant={permission === tag.defaultPermission ? "default" : "outline"}
                                        size="sm"
                                        className="text-xs px-2 py-1 h-auto"
                                        onClick={() => {
                                          addTag(tag.name, permission as "view" | "suggest" | "edit");
                                          setShowTagDropdown(false);
                                        }}
                                      >
                                        {permission}
                                      </Button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    {["view", "suggest", "edit"].map((permission) => (
                                      <Button
                                        key={permission}
                                        type="button"
                                        variant={permission === currentTag?.permission ? "default" : "outline"}
                                        size="sm"
                                        className="text-xs px-2 py-1 h-auto"
                                        onClick={() => {
                                          updateTagPermission(tag.name, permission as "view" | "suggest" | "edit");
                                        }}
                                      >
                                        {permission}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <p className="text-xs text-gray-600">
                      Permission tags control who can view, suggest changes, or edit this event based on their household role.
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
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a household" />
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
              render={({ field }) => {
                const selectedHouseholdId = form.watch("householdId");
                const selectedHousehold = households.find(h => h.id === selectedHouseholdId);
                
                return (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {user?.id && <SelectItem value={user.id}>Me</SelectItem>}
                        {selectedHousehold?.memberships
                          ?.filter((membership) => membership.userId !== user?.id)
                          .map((membership) => (
                            <SelectItem key={membership.userId} value={membership.userId}>
                              {membership.user.firstName} {membership.user.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createEventMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}