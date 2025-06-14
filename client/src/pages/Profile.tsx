import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Settings, LogOut, Home, Plus, Calendar, Shield, Share2, Eye, EyeOff, Tag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CreateHouseholdModal from "@/components/CreateHouseholdModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { HouseholdWithMembers } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's households
  const { data: households, isLoading: householdsLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  // Fetch Google Calendar connection status
  const { data: googleStatus, isLoading: googleStatusLoading } = useQuery<{connected: boolean, syncEnabled: boolean}>({
    queryKey: ["/api/google/status"],
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Connect to Google Calendar
  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/google/auth", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to get auth URL");
      return response.json();
    },
    onSuccess: (data: any) => {
      window.location.href = data.authUrl;
    },
  });

  // Disconnect Google Calendar
  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to disconnect");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
    },
  });

  // Manual Google Calendar sync
  const syncGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/google/sync", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to sync");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleConnectGoogleCalendar = () => {
    connectGoogleMutation.mutate();
  };

  const handleDisconnectGoogleCalendar = () => {
    disconnectGoogleMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="safe-area-top bg-primary"></div>
      
      <AppHeader currentHousehold={null} onHouseholdChange={() => {}} />
      
      <main className="flex-1 overflow-hidden">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile & Settings</h1>
          
          {/* User profile section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || user.email || 'User')}&background=6366f1&color=fff`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>
          
          {/* Household management */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                My Households
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {householdsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : households && households.length > 0 ? (
                <>
                  {households.map((household) => {
                    const userMembership = household.memberships.find(m => m.userId === user.id);
                    return (
                      <div key={household.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{household.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {userMembership?.role} • {household.memberCount} members
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    onClick={() => setShowCreateHousehold(true)}
                    variant="outline"
                    className="w-full border-dashed border-gray-300 text-gray-600 hover:border-gray-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Household
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-600 mb-4">You're not part of any households yet</p>
                  <Button
                    onClick={() => setShowCreateHousehold(true)}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Household
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Google Calendar Integration */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {googleStatusLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Google Calendar</h4>
                      <p className="text-sm text-gray-600">
                        {googleStatus?.connected ? 'Sync enabled' : 'Connect to sync your calendar events'}
                      </p>
                    </div>
                  </div>
                  {googleStatus?.connected ? (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => syncGoogleMutation.mutate()}
                        disabled={syncGoogleMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        {syncGoogleMutation.isPending ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <Button
                        onClick={handleDisconnectGoogleCalendar}
                        disabled={disconnectGoogleMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        {disconnectGoogleMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectGoogleCalendar}
                      disabled={connectGoogleMutation.isPending}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {connectGoogleMutation.isPending ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* App Settings */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                App Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-3" />
                Privacy Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-3" />
                Notification Preferences
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <User className="h-4 w-4 mr-3" />
                Account Settings
              </Button>
            </CardContent>
          </Card>
          
          {/* Logout */}
          <Card>
            <CardContent className="p-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />

      <CreateHouseholdModal 
        open={showCreateHousehold} 
        onOpenChange={setShowCreateHousehold}
      />
    </div>
  );
}
