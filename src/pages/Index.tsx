
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Mail, Shield, Settings, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  const howItWorksRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-3 py-1 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium slide-down" style={{ animationDelay: "200ms" }}>
              Introducing TimeCapsule
            </div>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance slide-down"
              style={{ animationDelay: "400ms" }}
            >
              Schedule files to be sent <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                exactly when needed
              </span>
            </h1>
            <p 
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto slide-down"
              style={{ animationDelay: "600ms" }}
            >
              TimeCapsule lets you upload and schedule files to be delivered via email at precisely the right moment.
            </p>
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 slide-down"
              style={{ animationDelay: "800ms" }}
            >
              <Link to="/auth">
                <Button className="hero-button bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="hero-button w-full sm:w-auto"
                onClick={scrollToHowItWorks}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={howItWorksRef} className="section bg-secondary/50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, intuitive, and powerful. Schedule your files in three easy steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-2xl p-6 shadow-sm border border-border scale-in" style={{ animationDelay: "200ms" }}>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Files</h3>
              <p className="text-muted-foreground">
                Securely upload any file type that you need to send later.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-2xl p-6 shadow-sm border border-border scale-in" style={{ animationDelay: "400ms" }}>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Schedule Delivery</h3>
              <p className="text-muted-foreground">
                Set the exact time and date when your files should be sent.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-2xl p-6 shadow-sm border border-border scale-in" style={{ animationDelay: "600ms" }}>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Automatic Delivery</h3>
              <p className="text-muted-foreground">
                Recipients get your files via email exactly when scheduled.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose TimeCapsule?</h2>
              <p className="text-muted-foreground mb-8">
                TimeCapsule combines simplicity with powerful features to give you complete control over your file deliveries.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 rounded-full p-1 bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Secure File Storage</h3>
                    <p className="text-sm text-muted-foreground">Files are encrypted and stored securely until delivery time.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 rounded-full p-1 bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Customizable Options</h3>
                    <p className="text-sm text-muted-foreground">Personalize delivery settings and email templates.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 rounded-full p-1 bg-primary/10">
                    <Filter className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Advanced Filtering</h3>
                    <p className="text-sm text-muted-foreground">Easily manage and filter your scheduled files.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90">
                    Start Scheduling
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="glass-card rounded-2xl shadow-lg p-6 md:p-8 max-w-md mx-auto bg-card text-card-foreground dark:bg-gray-800/80">
                <div className="absolute -top-4 -right-4 bg-primary text-white text-xs px-3 py-1 rounded-full">
                  Dashboard Preview
                </div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Upcoming Deliveries</h3>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-lg bg-secondary/30 dark:bg-gray-700/50 p-3 shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">Project Proposal.pdf</p>
                          <p className="text-xs text-muted-foreground">To: client@example.com</p>
                        </div>
                        <div className="rounded-full bg-gray-200 dark:bg-gray-600 py-1 px-2 text-xs">
                          Tomorrow
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full" 
                          style={{ width: `${90 - (item * 30)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="absolute -z-10 -bottom-6 -right-6 h-64 w-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"></div>
              <div className="absolute -z-10 -top-6 -left-6 h-48 w-48 bg-gradient-to-tr from-accent/10 to-primary/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-primary/5">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of users who trust TimeCapsule for their scheduled file delivery needs.
          </p>
          <Link to="/auth">
            <Button className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg shadow-md">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-secondary/30 py-12">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link
                to="/"
                className="text-xl font-medium flex items-center space-x-2"
              >
                <Calendar className="h-6 w-6 text-primary" />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  TimeCapsule
                </span>
              </Link>
              <p className="text-sm text-muted-foreground mt-2">
                Schedule files to be sent at the perfect time.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4">
              <Link to="/" className="text-sm hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/auth" className="text-sm hover:text-primary transition-colors">
                Sign Up
              </Link>
              <Link to="/auth" className="text-sm hover:text-primary transition-colors">
                Login
              </Link>
              <a href="#" className="text-sm hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm hover:text-primary transition-colors">
                Privacy
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} TimeCapsule. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
