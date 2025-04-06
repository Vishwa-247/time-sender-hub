
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Bell, Palette, LogOut, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  
  // Create refs for each section
  const profileSectionRef = useRef<HTMLElement>(null);
  const notificationsSectionRef = useRef<HTMLElement>(null);
  const appearanceSectionRef = useRef<HTMLElement>(null);
  
  // Profile settings
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Effect to set email and name from authenticated user
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      
      // Try to get the user's name from metadata
      const userName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.user_metadata?.preferred_name || "";
      
      if (userName) {
        setName(userName);
      } else {
        // Fallback: get user profile from database
        const fetchUserProfile = async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();
              
            if (data && data.full_name) {
              setName(data.full_name);
            } else {
              setName(""); // Empty string if no name found
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        };
        
        fetchUserProfile();
      }
    }
  }, [user]);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scheduledDeliveries, setScheduledDeliveries] = useState(true);
  const [failedDeliveries, setFailedDeliveries] = useState(true);
  
  // Appearance settings
  const [activeAccentColor, setActiveAccentColor] = useState(() => {
    const storedColor = localStorage.getItem('accentColor');
    return storedColor || "#3b82f6"; // Default to blue if no stored preference
  });
  
  // Effect to initialize accent color from localStorage on component mount
  useEffect(() => {
    const storedColor = localStorage.getItem('accentColor');
    if (storedColor) {
      applyAccentColor(storedColor);
      setActiveAccentColor(storedColor);
    }
  }, []);
  
  // Scroll to section functions
  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name }
      });
      
      if (error) throw error;
      
      // Also update profile if it exists
      await supabase
        .from('profiles')
        .upsert({ 
          id: user?.id,
          full_name: name,
          email: email
        });
        
      toast.success("Profile settings updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNotificationSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.success("Notification preferences updated");
  };
  
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  // Helper function to update CSS variables for accent color
  const applyAccentColor = (color: string) => {
    // Convert hex to HSL values
    const r = parseInt(color.substr(1, 2), 16) / 255;
    const g = parseInt(color.substr(3, 2), 16) / 255;
    const b = parseInt(color.substr(5, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    const hue = Math.round(h * 360);
    const saturation = Math.round(s * 100);
    const lightness = Math.round(l * 100);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--primary', `${hue} ${saturation}% ${lightness}%`);
    document.documentElement.style.setProperty('--accent', `${hue} ${saturation}% ${lightness}%`);
    
    // Store the selected color in localStorage
    localStorage.setItem('accentColor', color);
  };

  const handleAccentColorChange = (color: string) => {
    setActiveAccentColor(color);
    applyAccentColor(color);
    toast.success("Accent color updated");
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account preferences and settings</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
          {/* Sidebar */}
          <div className="space-y-1 md:border-r border-border pr-6">
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              size="lg"
              onClick={() => scrollToSection(profileSectionRef)}
            >
              <User className="h-4 w-4 mr-2" />
              <span>Profile</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              size="lg"
              onClick={() => scrollToSection(notificationsSectionRef)}
            >
              <Bell className="h-4 w-4 mr-2" />
              <span>Notifications</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              size="lg"
              onClick={() => scrollToSection(appearanceSectionRef)}
            >
              <Palette className="h-4 w-4 mr-2" />
              <span>Appearance</span>
            </Button>
            <Separator className="my-4" />
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" 
              size="lg"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log out</span>
            </Button>
          </div>
          
          {/* Main content */}
          <div className="space-y-12">
            {/* Profile Section */}
            <section ref={profileSectionRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </h2>
              </div>
              
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
                      {name ? 
                        name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
                        : <Calendar className="h-10 w-10" />}
                    </div>
                    <Button variant="outline" size="icon" className="absolute bottom-0 right-0 h-7 w-7 rounded-full shadow-sm">
                      <Palette className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-medium">{name || "Add your name"}</h3>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    <Button variant="link" className="p-0 h-auto text-xs">
                      Change avatar
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </section>
            
            <Separator />
            
            {/* Notifications Section */}
            <section ref={notificationsSectionRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Settings
                </h2>
              </div>
              
              <form onSubmit={handleNotificationSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications about your account
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Scheduled Deliveries</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your files are scheduled for delivery
                      </p>
                    </div>
                    <Switch
                      checked={scheduledDeliveries}
                      onCheckedChange={setScheduledDeliveries}
                      disabled={!emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Failed Deliveries</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a file delivery fails
                      </p>
                    </div>
                    <Switch
                      checked={failedDeliveries}
                      onCheckedChange={setFailedDeliveries}
                      disabled={!emailNotifications}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Save Notification Settings
                </Button>
              </form>
            </section>
            
            <Separator />
            
            {/* Appearance Section */}
            <section ref={appearanceSectionRef}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Appearance
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme Preference</Label>
                  
                  <RadioGroup
                    value={theme || "system"}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      theme === "light" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}>
                      <RadioGroupItem value="light" id="light" className="sr-only" />
                      <Label
                        htmlFor="light"
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div className="h-24 w-full rounded-md bg-[#f8fafc] border flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Check className={`h-4 w-4 ${theme === "light" ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>
                        <span>Light</span>
                      </Label>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      theme === "dark" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}>
                      <RadioGroupItem value="dark" id="dark" className="sr-only" />
                      <Label
                        htmlFor="dark"
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div className="h-24 w-full rounded-md bg-[#1e293b] border flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Check className={`h-4 w-4 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>
                        <span>Dark</span>
                      </Label>
                    </div>
                    
                    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      theme === "system" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}>
                      <RadioGroupItem value="system" id="system" className="sr-only" />
                      <Label
                        htmlFor="system"
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div className="h-24 w-full rounded-md bg-gradient-to-r from-[#f8fafc] to-[#1e293b] border flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Check className={`h-4 w-4 ${theme === "system" ? "opacity-100" : "opacity-0"}`} />
                          </div>
                        </div>
                        <span>System</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    {[
                      {color: "#3b82f6", name: "Blue"},
                      {color: "#8b5cf6", name: "Purple"},
                      {color: "#f97316", name: "Orange"},
                      {color: "#10b981", name: "Green"},
                      {color: "#ef4444", name: "Red"},
                      {color: "#0ea5e9", name: "Sky"}
                    ].map(({color, name}) => (
                      <button
                        key={color}
                        type="button"
                        className="h-8 w-8 rounded-full border flex items-center justify-center"
                        style={{ backgroundColor: color }}
                        aria-label={`Select ${name} as accent color`}
                        onClick={() => handleAccentColorChange(color)}
                      >
                        {color === activeAccentColor && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
