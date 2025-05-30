import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Calendar, Plus, CheckSquare, Users, Bell } from "lucide-react";
import { useState } from "react";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateEventModal from "@/components/CreateEventModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { EventWithDetails, TodoWithDetails, HouseholdWithMembers } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | "all">("all");

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  // Set default household - null for "all" view, specific household otherwise
  const currentHousehold = currentHouseholdId === "all" ? null : households?.find(h => h.id === currentHouseholdId) || null;

  // Fetch today's events
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: allEvents, isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events", { 
      startDate: format(today, "yyyy-MM-dd"),
      endDate: format(tomorrow, "yyyy-MM-dd")
    }],
  });

  // Fetch all todos
  const { data: allTodos, isLoading: todosLoading } = useQuery<TodoWithDetails[]>({
    queryKey: ["/api/todos"],
  });

  // Filter data based on selected household
  const todayEvents = currentHouseholdId === "all" 
    ? allEvents || []
    : allEvents?.filter(event => event.householdId === currentHouseholdId) || [];

  const todos = currentHouseholdId === "all"
    ? allTodos || []
    : allTodos?.filter(todo => todo.householdId === currentHouseholdId) || [];

  const pendingTodos = todos?.filter(todo => !todo.completed) || [];

  if (householdsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <AppHeader currentHousehold={null} onHouseholdChange={() => {}} />
        <main className="p-4 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isToday(date)) return "Due Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return "This Week";
    return format(date, "MMM d");
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return "bg-gray-100 text-gray-800";
    const date = new Date(dueDate);
    if (isToday(date)) return "bg-red-100 text-red-800";
    if (isTomorrow(date)) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="safe-area-top bg-primary"></div>
      
      <AppHeader 
        currentHousehold={currentHousehold || null} 
        onHouseholdChange={setCurrentHouseholdId}
      />
      
      <main className="flex-1 overflow-hidden">
        <div className="p-4 space-y-6">
          
          {/* Quick Actions */}
          <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-lg">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowCreateEvent(true)}
                variant="outline"
                className="flex flex-col items-center justify-center p-4 h-auto bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary"
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Event</span>
              </Button>
              <Button
                onClick={() => setShowCreateTask(true)}
                variant="outline"
                className="flex flex-col items-center justify-center p-4 h-auto bg-secondary/10 border-secondary/20 hover:bg-secondary/20 text-secondary"
              >
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Task</span>
              </Button>
            </div>
          </section>
          
          {/* Today's Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <p className="text-sm text-gray-600">{format(today, "EEEE, MMMM d")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : todayEvents && todayEvents.length > 0 ? (
                todayEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg">
                    <div className="w-1 h-12 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                      </p>
                      <div className="flex items-center mt-2 space-x-2">
                        {event.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                            {event.category}
                          </span>
                        )}
                        {event.assignee && (
                          <span className="text-xs text-gray-600">
                            {event.assignee.firstName || event.assignee.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No events scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pending Tasks */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pending Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todosLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingTodos.length > 0 ? (
                pendingTodos.slice(0, 5).map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg">
                    <button className="w-5 h-5 border-2 border-gray-300 rounded hover:border-primary transition-colors">
                    </button>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{todo.title}</h3>
                      {todo.assignee && (
                        <p className="text-sm text-gray-600">
                          Assigned to: {todo.assignee.firstName || todo.assignee.email}
                        </p>
                      )}
                    </div>
                    {todo.dueDate && (
                      <span className={`px-2 py-1 text-xs rounded-md font-medium ${getDueDateColor(todo.dueDate)}`}>
                        {formatDueDate(todo.dueDate)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No pending tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Household Members */}
          {currentHousehold && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Household Members</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  Manage
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentHousehold.memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center space-x-3">
                    <img
                      src={membership.user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(membership.user.firstName || membership.user.email || 'User')}&background=6366f1&color=fff`}
                      alt={membership.user.firstName || membership.user.email || 'User'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {membership.user.firstName ? `${membership.user.firstName} ${membership.user.lastName || ''}`.trim() : membership.user.email}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">{membership.role}</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full" title="Online"></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <BottomNavigation />

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowCreateEvent(true)}
        size="lg"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white z-40"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreateEventModal 
        open={showCreateEvent} 
        onOpenChange={setShowCreateEvent}
        currentHousehold={currentHousehold}
      />
      
      <CreateTaskModal 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        currentHousehold={currentHousehold}
      />
    </div>
  );
}
