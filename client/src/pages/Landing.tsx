import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, CheckSquare, Users, Shield, Share2 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Header */}
      <header className="safe-area-top px-4 py-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Ohana</h1>
          </div>
          <p className="text-gray-600">Household management for modern relationships</p>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 max-w-md mx-auto">
            Organize your household with the people you love
          </h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            Designed for polyamorous relationships and extended families who want to stay connected and organized.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Shared Calendars</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Keep everyone on the same page with household events, appointments, and important dates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-secondary" />
                </div>
                <CardTitle className="text-lg">Task Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Assign and track household chores, errands, and responsibilities fairly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-lg">Multiple Households</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage multiple households and relationships with flexible role-based permissions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <CardTitle className="text-lg">Privacy First</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Control who sees what with granular privacy settings and secure data handling.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Share2 className="h-5 w-5 text-gray-600" />
                </div>
                <CardTitle className="text-lg">Easy Invites</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Invite partners and family members with simple invite codes or links.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 pt-4">
          <Button 
            onClick={handleLogin}
            size="lg"
            className="w-full max-w-sm mx-auto bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Get Started
          </Button>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            By continuing, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-gray-500 text-sm safe-area-bottom">
        <p>Made with ❤️ for modern families</p>
      </footer>
    </div>
  );
}
