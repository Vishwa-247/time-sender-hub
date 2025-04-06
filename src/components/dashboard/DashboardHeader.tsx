
import { Button } from "@/components/ui/button";
import { Plus, Mail } from "lucide-react";

interface DashboardHeaderProps {
  onNewSchedule: () => void;
  onManualTrigger: () => void;
  isLoading: boolean;
}

const DashboardHeader = ({
  onNewSchedule,
  onManualTrigger,
  isLoading
}: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">File Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage and schedule your file deliveries</p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={onNewSchedule} 
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" /> 
          Schedule New File
        </Button>
        
        <Button 
          onClick={onManualTrigger} 
          variant="outline"
          disabled={isLoading}
        >
          <Mail className="h-4 w-4 mr-2" />
          Trigger Sending
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
