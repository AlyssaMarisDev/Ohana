import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import { CalendarIcon, CheckSquare, Users, Tag, X, Plus } from "lucide-react";
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
import { insertTodoSchema } from "@shared/schema";
import type { TodoWithDetails, HouseholdWithMembers, User } from "@shared/schema";

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

const formSchema = insertTodoSchema.extend({
  dueDate: z.date().optional(),
  todoTags: z.array(z.string()).default([]),
}).partial({ createdBy: true }); // Make createdBy optional for editing

type FormData = z.infer<typeof formSchema>;

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TodoWithDetails;
  currentHousehold: HouseholdWithMembers | null;
}

export default function EditTaskModal({
  open,
  onOpenChange,
  task,
  currentHousehold,
}: EditTaskModalProps) {
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
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignedTo: task.assignedTo || "",
      householdId: task.householdId,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      todoTags: task.tags?.map(tag => tag.tag) || [],
    },
  });

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

  const updateTaskMutation = useMutation({
    mutationFn: (data: FormData) => {
      const processedData = {
        ...data,
        assignedTo: data.assignedTo || null,
        todoTags: data.todoTags,
        createdBy: task.createdBy, // Add the required createdBy field
      };
      return apiRequest("PATCH", `/api/todos/${task.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      onOpenChange(false);
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Task update error:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => {
      return apiRequest("DELETE", `/api/todos/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      onOpenChange(false);
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Task deletion error:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateTaskMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Update the details of your task.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
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
                      placeholder="Enter task description" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
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
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date (optional)</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(undefined)}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                disabled={deleteTaskMutation.isPending}
              >
                {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
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
                  type="submit"
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}