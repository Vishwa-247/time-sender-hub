
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Settings, LogIn, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const isAccessPage = location.pathname.includes("/access/");
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't show full navigation on access pages
  if (isAccessPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 glass-effect py-3">
        <div className="container-custom flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-medium flex items-center space-x-2"
          >
            <Calendar className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TimeCapsule
            </span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isLandingPage
          ? "glass-effect py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container-custom flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-medium flex items-center space-x-2"
        >
          <Calendar className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TimeCapsule
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/" ? "text-primary" : "text-foreground/80"
            }`}
          >
            Home
          </Link>
          {user && (
            <>
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === "/dashboard"
                    ? "text-primary"
                    : "text-foreground/80"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === "/settings"
                    ? "text-primary"
                    : "text-foreground/80"
                }`}
              >
                Settings
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Button
                variant="ghost"
                className="hidden md:flex"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              {/* Removed dashboard button that was here */}
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button
                  variant="ghost"
                  className="hidden md:flex"
                  aria-label="Sign in"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Sign in"
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col space-y-4 mt-8">
                <Link
                  to="/"
                  className="text-lg font-medium py-2 transition-colors hover:text-primary"
                >
                  Home
                </Link>
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-lg font-medium py-2 transition-colors hover:text-primary"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/settings"
                      className="text-lg font-medium py-2 transition-colors hover:text-primary"
                    >
                      Settings
                    </Link>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button className="w-full mt-4">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
