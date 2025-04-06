
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");
  
  // Sign In form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Sign Up form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signUpError, setSignUpError] = useState("");
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }
    await signIn(email, password);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    
    if (!fullName.trim()) {
      setSignUpError("Please enter your full name");
      return;
    }
    
    if (!newEmail.trim()) {
      setSignUpError("Please enter your email");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setSignUpError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters");
      return;
    }
    
    await signUp(newEmail, newPassword, fullName);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container-custom flex flex-col items-center justify-center flex-1 py-12">
        <Link to="/" className="text-xl font-medium flex items-center mb-8">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TimeCapsule
          </span>
        </Link>
        
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome to TimeCapsule</CardTitle>
            <CardDescription className="text-center">
              Login or create an account to schedule your file deliveries
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <CardContent className="pt-6">
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        placeholder="your@email.com"
                        type="email"
                        required
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/reset-password" className="text-xs text-primary">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        required
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        required
                        className="pl-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newEmail"
                        placeholder="your@email.com"
                        type="email"
                        required
                        className="pl-10"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type="password"
                        required
                        className="pl-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        required
                        className="pl-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  {signUpError && (
                    <div className="text-sm text-destructive">{signUpError}</div>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
          
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
