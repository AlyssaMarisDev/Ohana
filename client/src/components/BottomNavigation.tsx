import { useLocation } from "wouter";
import { Home, Calendar, CheckSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          
          return (
            <Button
              key={path}
              variant="ghost"
              onClick={() => setLocation(path)}
              className={`flex flex-col items-center justify-center py-2 px-4 h-auto transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${isActive ? "text-primary" : "text-gray-400"}`} />
              <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-gray-400"}`}>
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
