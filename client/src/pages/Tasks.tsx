import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Plus, CheckSquare, Circle, Filter } from "lucide-react";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateTaskModal from "@/components/CreateTaskModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { TodoWithDetails, HouseholdWithMembers } from "@shared/schema";

type FilterType = "all" | "my-tasks" | "completed" | "overdue";

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  const currentHousehold = households?.find(h => h.id === currentHouseholdId) || households?.[0];

  // Fetch todos
  const { data: todos, isLoading: todosLoading } = useQuery<TodoWithDetails[]>({
    queryKey: ["/api/todos", { householdId: currentHousehold?.id }],
    enabled: !!currentHousehold,
  });

  // Toggle todo completion
  const toggleTodoMutation = useMutation({
    mutationFn: (todoId: number) => apiRequest("PATCH", `/api/todos/${todoId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
  });

  const handleToggleTodo = (todoId: number) => {
    toggleTodoMutation.mutate(todoId);
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isToday(date)) return "Due Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return "This Week";
    return format(date, "MMM d");
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return "secondary";
    const date = new Date(dueDate);
    if (isToday(date)) return "destructive";
    if (isTomorrow(date)) return "default";
    return "secondary";
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getFilteredTodos = () => {
    if (!todos) return [];
    
    switch (activeFilter) {
      case "my-tasks":
        return todos.filter(todo => 
          todo.assignedTo === user?.id || todo.createdBy === user?.id
        );
      case "completed":
        return todos.filter(todo => todo.completed);
      case "overdue":
        return todos.filter(todo => 
          !todo.completed && 
          todo.dueDate && 
          new Date(todo.dueDate) < new Date()
        );
      default:
        return todos;
    }
  };

  const filteredTodos = getFilteredTodos();

  if (householdsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <AppHeader currentHousehold={null} onHouseholdChange={() => {}} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
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
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <Button
              onClick={() => setShowCreateTask(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          
          {/* Task filters */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {[
              { key: "all", label: "All" },
              { key: "my-tasks", label: "My Tasks" },
              { key: "completed", label: "Completed" },
              { key: "overdue", label: "Overdue" },
            ].map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={`whitespace-nowrap ${
                  activeFilter === filter.key 
                    ? "bg-primary text-white" 
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          
          {/* Tasks list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckSquare className="h-5 w-5 mr-2" />
                Tasks ({filteredTodos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todosLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTodos.length > 0 ? (
                <div className="space-y-3">
                  {filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-start space-x-3 p-3 border rounded-lg transition-colors ${
                        todo.completed 
                          ? "bg-gray-50 border-gray-200" 
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleToggleTodo(todo.id)}
                          disabled={toggleTodoMutation.isPending}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium ${
                          todo.completed 
                            ? "text-gray-500 line-through" 
                            : "text-gray-900"
                        }`}>
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p className={`text-sm mt-1 ${
                            todo.completed ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {todo.description}
                          </p>
                        )}
                        <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                          {todo.priority && (
                            <Badge variant={getPriorityColor(todo.priority)} className="text-xs">
                              {todo.priority} priority
                            </Badge>
                          )}
                          {todo.dueDate && (
                            <Badge variant={getDueDateColor(todo.dueDate)} className="text-xs">
                              {formatDueDate(todo.dueDate)}
                            </Badge>
                          )}
                          {todo.assignee && (
                            <span className="text-xs text-gray-600">
                              Assigned to: {todo.assignee.firstName || todo.assignee.email}
                            </span>
                          )}
                          {todo.tags && todo.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {todo.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {todo.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{todo.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-sm mb-4">
                    {activeFilter === "all" 
                      ? "Get started by creating your first task"
                      : `No tasks match the "${activeFilter.replace("-", " ")}" filter`
                    }
                  </p>
                  {activeFilter === "all" && (
                    <Button
                      onClick={() => setShowCreateTask(true)}
                      variant="outline"
                    >
                      Create Task
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />

      <CreateTaskModal 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        currentHousehold={currentHousehold}
      />
    </div>
  );
}
