import { useQuery } from "@tanstack/react-query";
import { Home, Users, Crown, User as UserIcon, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HouseholdWithMembers } from "@shared/schema";

interface HouseholdSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHousehold: HouseholdWithMembers | null;
  onHouseholdChange: (householdId: number | "all") => void;
}

export default function HouseholdSelector({
  open,
  onOpenChange,
  currentHousehold,
  onHouseholdChange,
}: HouseholdSelectorProps) {
  // Fetch user's households
  const { data: households, isLoading } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
  });

  const handleSelectHousehold = (householdId: number) => {
    onHouseholdChange(householdId);
    onOpenChange(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "member":
        return <UserIcon className="h-4 w-4 text-blue-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2" />
            Select Household
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* All Households Option */}
          <Button
            variant={!currentHousehold ? "default" : "outline"}
            onClick={() => handleSelectHousehold("all")}
            className="w-full p-4 h-auto justify-start"
          >
            <div className="flex items-center space-x-3 w-full">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Home className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium">All Households</h3>
                <p className="text-sm text-gray-600">View all your households together</p>
              </div>
            </div>
          </Button>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : households && households.length > 0 ? (
            households.map((household) => (
              <Button
                key={household.id}
                variant={currentHousehold?.id === household.id ? "default" : "outline"}
                onClick={() => handleSelectHousehold(household.id)}
                className="w-full p-4 h-auto justify-start"
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">{household.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-3 w-3" />
                      <span>{household.memberCount} members</span>
                      {household.memberships.find(m => m.userId === currentHousehold?.id) && (
                        <div className="flex items-center space-x-1">
                          {getRoleIcon(household.memberships.find(m => m.userId === currentHousehold?.id)?.role || "member")}
                          <span className="capitalize">
                            {household.memberships.find(m => m.userId === currentHousehold?.id)?.role}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Home className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No households found</p>
              <p className="text-sm">Create or join a household to get started</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
