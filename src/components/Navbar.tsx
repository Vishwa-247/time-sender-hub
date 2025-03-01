
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Settings, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const isAuthenticated = false; // This will later be connected to auth state

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
          {isAuthenticated && (
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
          {isAuthenticated ? (
            <Link to="/settings">
              <Button variant="ghost" size="icon" aria-label="User settings">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
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
          )}
          <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
            <Button className="bg-primary hover:bg-primary/90">
              {isAuthenticated ? "Dashboard" : "Get Started"}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
