import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import HouseholdSelector from "./HouseholdSelector";
import { useAuth } from "@/hooks/useAuth";
import type { HouseholdWithMembers } from "@shared/schema";

interface AppHeaderProps {
  currentHousehold: HouseholdWithMembers | null;
  onHouseholdChange: (householdId: number | "all") => void;
}

export default function AppHeader({ currentHousehold, onHouseholdChange }: AppHeaderProps) {
  const { user } = useAuth();
  const [showHouseholdSelector, setShowHouseholdSelector] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            {/* Current household selector */}
            <Button
              variant="outline"
              onClick={() => setShowHouseholdSelector(true)}
              className="flex items-center space-x-2 bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-900"
            >
              <span className="text-sm font-medium">
                {currentHousehold?.name || "Select Household"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative p-2 hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
            
            {/* Profile */}
            <Button variant="ghost" size="sm" className="p-1 hover:bg-gray-100">
              <img
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || user?.email || 'User')}&background=6366f1&color=fff`}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
              />
            </Button>
          </div>
        </div>
      </header>

      <HouseholdSelector
        open={showHouseholdSelector}
        onOpenChange={setShowHouseholdSelector}
        currentHousehold={currentHousehold}
        onHouseholdChange={onHouseholdChange}
      />
    </>
  );
}
