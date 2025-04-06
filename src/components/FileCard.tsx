import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { MoreVertical, Calendar, Mail, Trash, Edit, Clock, FileIcon, CheckCircle, AlertCircle, FileText, Eye } from 'lucide-react';
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import FilePreview from './FilePreview';
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFileByToken } from '@/services/fileService';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  recipient: string;
  scheduledDate: Date;
  status: 'pending' | 'sent' | 'failed';
  progress?: number;
  createdAt?: Date;
  access_token?: string;
}

interface FileCardProps {
  file: FileItem;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const FileCard = ({ file, onDelete, onEdit }: FileCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progress, setProgress] = useState(file.progress || 0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string, type: string, url?: string }>({
    name: file.name,
    type: file.type
  });
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Function to truncate text with an ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    if (file.status === 'pending') {
      calculateProgress();
      
      const interval = setInterval(calculateProgress, 30000);
      return () => clearInterval(interval);
    } else if (file.status === 'sent') {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [file]);

  const calculateProgress = () => {
    const now = new Date();
    const createdAt = file.createdAt || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const scheduledDate = file.scheduledDate;
    
    if (scheduledDate < now) {
      setProgress(100);
      return;
    }
    
    const totalDuration = scheduledDate.getTime() - createdAt.getTime();
    const elapsedTime = now.getTime() - createdAt.getTime();
    
    const calculatedProgress = Math.min(Math.round((elapsedTime / totalDuration) * 100), 99);
    setProgress(calculatedProgress);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case 'sent':
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case 'failed':
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'sent':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };
  
  const getFileIcon = () => {
    const iconColor = isDarkMode ? "text-blue-400" : "text-blue-500";
    
    if (file.type.includes('image')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <FileText className={`h-6 w-6 ${iconColor}`} />
        </div>
      );
    }
    
    return (
      <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
        <FileIcon className={`h-6 w-6 ${iconColor}`} />
      </div>
    );
  };
  
  const getProgressColor = () => {
    return isDarkMode ? "bg-blue-500" : "bg-blue-500";
  };
  
  const getDateFormatted = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (file.scheduledDate.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (file.scheduledDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return format(file.scheduledDate, 'MMM dd, yyyy');
    }
  };
  
  const handleFilePreview = async () => {
    setPreviewOpen(true);
    
    if (file.status === 'sent' && file.access_token) {
      setIsLoadingPreview(true);
      try {
        const fileData = await getFileByToken(file.access_token);
        if (fileData) {
          setFilePreview({
            name: file.name,
            type: file.type,
            url: fileData.fileUrl
          });
        }
      } catch (error) {
        console.error("Error fetching file preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setFilePreview({
        name: file.name,
        type: file.type
      });
    }
  };
  
  return (
    <>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <Card className="overflow-hidden border border-border bg-card text-card-foreground dark:border-border cursor-pointer" onClick={handleFilePreview}>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="font-medium text-base line-clamp-1 text-foreground">
                        {truncateText(file.name, 20)}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{file.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Badge className={`flex items-center h-6 ${getStatusColor(file.status)}`}>
                {getStatusIcon(file.status)}
                <span>{file.status === 'pending' ? 'Pending' : file.status === 'sent' ? 'Sent' : 'Failed'}</span>
              </Badge>
              
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground ml-1" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px] bg-popover text-popover-foreground">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilePreview();
                    }}
                    className="text-foreground"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Preview</span>
                  </DropdownMenuItem>
                  {onEdit && file.status === 'pending' && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onEdit(file.id);
                      }}
                      className="text-foreground"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onDelete(file.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-2">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground truncate max-w-[200px] inline-block">
                        {file.recipient}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{file.recipient}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-foreground">
                  {getDateFormatted()} at {format(file.scheduledDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {file.status === 'pending' 
                    ? formatDistanceToNow(file.scheduledDate, { addSuffix: true })
                    : file.status === 'sent'
                    ? 'Delivered'
                    : 'Failed'
                  }
                </span>
              </div>
              <Progress
                value={progress} 
                className="h-2 w-full bg-muted"
                indicatorClassName={getProgressColor()}
              />
            </div>
          </CardFooter>
        </Card>
        
        <FilePreview file={filePreview} isLoading={isLoadingPreview} />
      </Dialog>
    </>
  );
};

export default FileCard;
