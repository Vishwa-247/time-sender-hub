
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ScheduleForm, { ScheduleFormData } from "@/components/ScheduleForm";
import { FileItem } from "@/components/FileCard";

interface ScheduleFileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: ScheduleFormData) => void;
  editingFile: FileItem | null;
}

const ScheduleFileDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  editingFile
}: ScheduleFileDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editingFile ? "Edit Scheduled File" : "Schedule New File"}
          </DialogTitle>
          <DialogDescription>
            {editingFile 
              ? "Update the recipient and schedule for this file." 
              : "Upload a file and set when it should be delivered."}
          </DialogDescription>
        </DialogHeader>
        <ScheduleForm 
          onSubmit={onSubmit}
          editingFile={editingFile ? {
            id: editingFile.id,
            name: editingFile.name,
            recipient: editingFile.recipient,
            scheduledDate: editingFile.scheduledDate
          } : null}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFileDialog;
