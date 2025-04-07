
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar as CalendarIcon, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FileUpload from "./FileUpload";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScheduleFormProps {
  onSubmit: (data: ScheduleFormData) => void;
  editingFile?: {
    id: string;
    name: string;
    recipient: string;
    scheduledDate: Date;
  } | null;
}

export interface ScheduleFormData {
  id?: string;
  file?: File;
  recipient: string;
  scheduledDate: Date;
  scheduledTime: string;
}

const ScheduleForm = ({ onSubmit, editingFile = null }: ScheduleFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [date, setDate] = useState<Date | undefined>(editingFile?.scheduledDate || undefined);
  const { toast } = useToast();
  
  const defaultTime = editingFile?.scheduledDate 
    ? format(editingFile.scheduledDate, "HH:mm")
    : "";

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ScheduleFormData>({
    defaultValues: {
      recipient: editingFile?.recipient || "",
      scheduledTime: defaultTime
    }
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    const filename = text.split('/').pop() || text;
    
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.includes('.') ? filename.split('.').pop() || '' : '';
    const name = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
    
    const truncatedName = extension 
      ? name.substring(0, maxLength - extension.length - 4) + '...' 
      : name.substring(0, maxLength - 3) + '...';
    
    return extension ? `${truncatedName}.${extension}` : truncatedName;
  };

  const processSubmit = (data: ScheduleFormData) => {
    if (!date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a date"
      });
      return;
    }

    if (!selectedFile && !editingFile) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please upload a file"
      });
      return;
    }

    const [hours, minutes] = data.scheduledTime.split(":").map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    if (scheduledDateTime < new Date()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Scheduled time cannot be in the past"
      });
      return;
    }

    const formData: ScheduleFormData = {
      recipient: data.recipient,
      scheduledDate: scheduledDateTime,
      scheduledTime: data.scheduledTime,
    };

    if (editingFile) {
      formData.id = editingFile.id;
    } else if (selectedFile) {
      formData.file = selectedFile;
    }
    
    onSubmit(formData);
    
    if (!editingFile) {
      setSelectedFile(null);
      setDate(undefined);
      reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      {!editingFile && (
        <div className="space-y-2">
          <Label>File</Label>
          <FileUpload onFileSelect={handleFileSelect} />
          {selectedFile && (
            <div className="mt-2 text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="truncate max-w-xs">
                      Selected: <span className="font-medium">{truncateText(selectedFile.name, 25)}</span>
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-80">
                    <p className="break-all">{selectedFile.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}
      {editingFile && (
        <div className="space-y-2">
          <Label>File</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 border border-input rounded-md bg-muted/30 text-sm truncate w-full max-w-full break-all overflow-hidden">
                  {truncateText(editingFile.name, 30)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-80">
                <p className="break-all">{editingFile.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="recipient"
            placeholder="recipient@example.com"
            className="pl-10"
            {...register("recipient", { 
              required: "Recipient email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
          />
        </div>
        {errors.recipient && (
          <p className="text-sm text-destructive">{errors.recipient.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledTime">Time</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="scheduledTime"
              type="time"
              className="pl-10"
              {...register("scheduledTime", { 
                required: "Time is required" 
              })}
            />
          </div>
          {errors.scheduledTime && (
            <p className="text-sm text-destructive">{errors.scheduledTime.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full">
        {editingFile ? "Update Schedule" : "Schedule Delivery"}
      </Button>
    </form>
  );
};

export default ScheduleForm;
