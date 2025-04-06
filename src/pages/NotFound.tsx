
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-xl font-medium flex items-center space-x-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TimeCapsule
            </span>
          </Link>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="py-12 border border-dashed rounded-xl bg-background text-foreground">
            <h2 className="text-4xl font-bold mb-4 text-foreground">404</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Oops! The page you're looking for cannot be found.
            </p>
            <Button asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
