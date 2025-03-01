
import { useState } from "react";
import { format } from "date-fns";
import { File, Calendar, Mail, AlertCircle, MoreVertical, Edit, Trash, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  recipient: string;
  scheduledDate: Date;
  status: "pending" | "sent" | "failed";
  createdAt: Date;
}

interface FileCardProps {
  file: FileItem;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const FileCard = ({ file, onDelete, onEdit }: FileCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "sent":
        return "bg-green-100 text-green-700 border-green-200";
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "sent":
        return <CheckCircle className="h-3 w-3" />;
      case "failed":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return "📷";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("excel") || type.includes("sheet")) return "📊";
    if (type.includes("zip") || type.includes("compressed")) return "🗜️";
    if (type.includes("video")) return "🎬";
    if (type.includes("audio")) return "🎵";
    return "📁";
  };

  const handleDelete = () => {
    toast.success(`File "${file.name}" deleted successfully`);
    onDelete(file.id);
  };

  const handleEdit = () => {
    onEdit(file.id);
  };

  const timeUntilScheduled = () => {
    const now = new Date();
    const diffTime = file.scheduledDate.getTime() - now.getTime();
    
    // If already passed
    if (diffTime < 0) return "Time passed";
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const now = new Date();
    const creationTime = file.createdAt.getTime();
    const scheduledTime = file.scheduledDate.getTime();
    const totalDuration = scheduledTime - creationTime;
    const elapsed = now.getTime() - creationTime;
    
    if (elapsed >= totalDuration) return 100;
    return Math.min(Math.floor((elapsed / totalDuration) * 100), 99);
  };

  return (
    <div 
      className={`relative bg-white rounded-xl shadow-sm border border-border p-4 transition-all duration-300 ${
        isHovered ? "shadow-md scale-[1.01]" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 h-10 w-10 mr-3 text-primary">
            <File className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium truncate max-w-[180px]">{file.name}</h3>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <div className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${getStatusColor(file.status)}`}>
            {getStatusIcon(file.status)}
            <span className="capitalize">{file.status}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 mb-3">
        <div className="flex items-center text-sm">
          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="truncate max-w-[230px]">{file.recipient}</span>
        </div>
        <div className="flex items-center text-sm">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{format(file.scheduledDate, "MMM dd, yyyy 'at' h:mm a")}</span>
        </div>
      </div>

      {file.status === "pending" && (
        <>
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{timeUntilScheduled()}</span>
          </div>
          
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileCard;
