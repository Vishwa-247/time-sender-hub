
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });
      
      if (error) throw error;
      
      setIsSubmitted(true);
      toast.success("Password reset instructions sent to your email");
    } catch (error: any) {
      toast.error(error.message || "Error sending password reset");
      console.error("Error sending password reset:", error);
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              {isSubmitted 
                ? "Check your email for password reset instructions" 
                : "Enter your email and we'll send you instructions to reset your password"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {!isSubmitted ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
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
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  We've sent reset instructions to <strong>{email}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <Link to="/auth" className="text-sm flex items-center text-primary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
