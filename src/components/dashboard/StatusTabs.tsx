
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import FileCard, { FileItem } from "@/components/FileCard";

interface StatusTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isLoading: boolean;
  filteredFiles: FileItem[];
  onOpenDialog: () => void;
  onDeleteFile: (id: string) => void;
  onEditFile: (id: string) => void;
}

const StatusTabs = ({
  activeTab,
  onTabChange,
  isLoading,
  filteredFiles,
  onOpenDialog,
  onDeleteFile,
  onEditFile
}: StatusTabsProps) => {
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="all">All Files</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="sent">Sent</TabsTrigger>
        <TabsTrigger value="failed">Failed</TabsTrigger>
      </TabsList>
      
      <TabsContent value={activeTab} className="mt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl">
            <p className="text-muted-foreground mb-4">No files found</p>
            <Button 
              variant="outline" 
              onClick={onOpenDialog}
            >
              <Plus className="h-4 w-4 mr-2" /> 
              Schedule Your First File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <FileCard 
                key={file.id} 
                file={file} 
                onDelete={onDeleteFile}
                onEdit={onEditFile}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default StatusTabs;
