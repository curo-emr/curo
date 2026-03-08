import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Shield, Bell, Key, Mail, Phone } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted p-1 rounded-md mb-6 w-full md:w-auto h-auto grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
            <User className="h-4 w-4 mr-2" /> Account
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
            <Shield className="h-4 w-4 mr-2" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
            <Bell className="h-4 w-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
            <Key className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Update your account information.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-24 w-24 rounded-full bg-primary/15 flex items-center justify-center text-primary text-3xl font-bold border-4 border-white shadow-sm">
                    NP
                  </div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="Nimal" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Perera" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-medium text-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Email</Label>
                    <Input id="email" type="email" defaultValue="nimal.perera@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Phone</Label>
                    <Input id="phone" type="tel" defaultValue="+94 77 123 4567" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t flex justify-end">
              <Button className="bg-primary hover:bg-primary/90">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
           <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Portal Preferences</CardTitle>
              <CardDescription>Customize how CuroMD Patient Portal works for you.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-view">Default View on Login</Label>
                <Select defaultValue="dashboard">
                  <SelectTrigger id="default-view">
                    <SelectValue placeholder="Select default view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard — Health Summary</SelectItem>
                    <SelectItem value="appointments">Appointments</SelectItem>
                    <SelectItem value="prescriptions">Prescriptions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-format">Time Format</Label>
                <Select defaultValue="12h">
                  <SelectTrigger id="time-format">
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24-hour (e.g., 14:00)</SelectItem>
                    <SelectItem value="12h">12-hour (e.g., 2:00 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t flex justify-end">
              <Button className="bg-primary hover:bg-primary/90">Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Choose what alerts you receive and how.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground" />
                <p>Notification settings will be available when SMS and email integrations are configured.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Security &amp; Password</CardTitle>
              <CardDescription>Manage your password and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <div className="space-y-2 max-w-md">
                  <Label htmlFor="current-pw">Current Password</Label>
                  <Input id="current-pw" type="password" />
               </div>
               <div className="space-y-2 max-w-md">
                  <Label htmlFor="new-pw">New Password</Label>
                  <Input id="new-pw" type="password" />
               </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="confirm-pw">Confirm New Password</Label>
                  <Input id="confirm-pw" type="password" />
               </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t flex justify-end">
              <Button className="bg-primary hover:bg-primary/90">Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
