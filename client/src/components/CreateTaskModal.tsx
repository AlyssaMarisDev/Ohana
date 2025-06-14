import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import { CheckSquare, Calendar, User, Tag, X, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { HouseholdWithMembers } from "@shared/schema";

// Predefined tag options for task categorization
const PREDEFINED_TAGS = [
  { 
    name: "adults", 
    label: "Adults Only", 
    description: "Tasks not suitable for children",
    color: "bg-red-100 text-red-800"
  },
  { 
    name: "family", 
    label: "Family", 
    description: "Family-friendly tasks",
    color: "bg-blue-100 text-blue-800"
  },
  { 
    name: "work", 
    label: "Work", 
    description: "Professional and work tasks",
    color: "bg-gray-100 text-gray-800"
  },
  { 
    name: "personal", 
    label: "Personal", 
    description: "Personal tasks and activities",
    color: "bg-green-100 text-green-800"
  },
  { 
    name: "social", 
    label: "Social", 
    description: "Social tasks and events",
    color: "bg-purple-100 text-purple-800"
  },
  { 
    name: "medical", 
    label: "Medical", 
    description: "Health and medical tasks",
    color: "bg-orange-100 text-orange-800"
  }
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignedTo: z.string().optional(),
  householdId: z.number().optional(),
  todoTags: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHousehold: HouseholdWithMembers | null;
}

export default function CreateTaskModal({
  open,
  onOpenChange,
  currentHousehold,
}: CreateTaskModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

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
      priority: "medium",
      assignedTo: "",
      householdId: getDefaultHousehold(),
      todoTags: [],
    },
  });

  // Update household when households data changes or currentHousehold changes
  useEffect(() => {
    const defaultHousehold = getDefaultHousehold();
    if (defaultHousehold && defaultHousehold !== form.getValues("householdId")) {
      form.setValue("householdId", defaultHousehold);
    }
  }, [households, currentHousehold]);

  // Helper functions for tag management
  const addTag = (tagName: string) => {
    const currentTags = form.getValues("todoTags");
    
    if (!currentTags.includes(tagName)) {
      form.setValue("todoTags", [...currentTags, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    const currentTags = form.getValues("todoTags");
    form.setValue("todoTags", currentTags.filter(t => t !== tagName));
  };

  const createTaskMutation = useMutation({
    mutationFn: (data: FormData) => {
      const processedData = {
        ...data,
        dueDate: data.dueDate?.toISOString(),
        createdBy: user?.id,
        assignedTo: data.assignedTo || null,
        todoTags: data.todoTags,
      };
      return apiRequest("POST", "/api/todos", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckSquare className="h-5 w-5 mr-2" />
            Create Task
          </DialogTitle>
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
                    <Input placeholder="Task title" {...field} />
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
                      placeholder="Task description (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a due date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setShowCalendar(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {currentHousehold && (
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a person (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentHousehold.memberships.map((membership) => (
                          <SelectItem key={membership.userId} value={membership.userId}>
                            {membership.user.firstName
                              ? `${membership.user.firstName} ${membership.user.lastName || ''}`.trim()
                              : membership.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            {/* Todo Tags */}
            <FormField
              control={form.control}
              name="todoTags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Task Tags
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
                          <h4 className="font-medium text-sm mb-2">Select Task Tags</h4>
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
                      Task tags help categorize tasks. User permissions to view these tags are managed in their profile settings.
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="flex-1 bg-secondary hover:bg-secondary/90"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
