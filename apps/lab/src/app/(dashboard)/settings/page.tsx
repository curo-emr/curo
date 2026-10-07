import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { Button } from "@curo/web/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { User, Bell, Key, Mail, Phone, MapPin } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="inline-flex items-center gap-2 bg-muted/70 py-6 px-2 rounded-2xl mb-6 shadow-inner">
          <TabsTrigger value="profile" className="flex items-center gap-2 px-5 py-4 text-sm font-medium text-muted-foreground rounded-xl transition-all duration-200 ease-in-out hover:text-foreground hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 px-5 py-4 text-sm font-medium text-muted-foreground rounded-xl transition-all duration-200 ease-in-out hover:text-foreground hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 px-5 py-4 text-sm font-medium text-muted-foreground rounded-xl transition-all duration-200 ease-in-out hover:text-foreground hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Key className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>Lab Technician Profile</CardTitle>
              <CardDescription>Update your personal and professional information.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-3xl font-bold border-4 border-white shadow-sm">
                    KS
                  </div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="Kamal" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Silva" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" defaultValue="Biochemistry" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input id="employeeId" defaultValue="LAB-2019-045" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="font-medium text-slate-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Email</Label>
                    <Input id="email" type="email" defaultValue="kamal.silva@curomd.example" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> Phone</Label>
                    <Input id="phone" type="tel" defaultValue="+94 77 555 6666" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> Address</Label>
                    <Input id="address" defaultValue="78, Main St, Colombo" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Choose what alerts you receive and how.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8 text-slate-500 space-y-2">
                <Bell className="h-8 w-8 mx-auto text-slate-300" />
                <p>Notification settings will be available when SMS integration is configured.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
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
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700">Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
