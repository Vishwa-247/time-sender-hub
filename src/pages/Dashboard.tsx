
import { useState, useEffect } from "react";
import { Filter, Plus, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import FileCard, { FileItem } from "@/components/FileCard";
import ScheduleForm, { ScheduleFormData } from "@/components/ScheduleForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data generator
const generateMockFiles = (): FileItem[] => {
  const fileTypes = [
    "application/pdf",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip"
  ];
  
  const fileNames = [
    "Project Proposal.pdf",
    "Financial Report.xlsx",
    "Contract Agreement.docx",
    "Product Image.jpg",
    "Source Code.zip",
    "Meeting Notes.pdf",
    "Marketing Presentation.pptx",
    "User Research.pdf",
    "Budget Plan.xlsx"
  ];
  
  const statuses = ["pending", "sent", "failed"] as const;
  
  return Array.from({ length: 9 }, (_, i) => {
    const now = new Date();
    const createdDate = new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000);
    
    // Random time in the future (0-30 days)
    const futureTime = i < 6 
      ? now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
      : now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000;
    
    const scheduledDate = new Date(futureTime);
    
    return {
      id: `file-${i}`,
      name: fileNames[i % fileNames.length],
      size: Math.floor(Math.random() * 10 * 1024 * 1024),
      type: fileTypes[i % fileTypes.length],
      recipient: `recipient${i}@example.com`,
      scheduledDate,
      status: i < 6 ? "pending" : statuses[i % statuses.length],
      createdAt: createdDate
    };
  });
};

const Dashboard = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    // Simulate loading from API
    const timer = setTimeout(() => {
      const mockFiles = generateMockFiles();
      setFiles(mockFiles);
      setFilteredFiles(mockFiles);
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    filterFiles();
  }, [searchQuery, statusFilter, activeTab, files]);
  
  const filterFiles = () => {
    let filtered = [...files];
    
    // Apply tab filter
    if (activeTab === "pending") {
      filtered = filtered.filter(file => file.status === "pending");
    } else if (activeTab === "sent") {
      filtered = filtered.filter(file => file.status === "sent");
    } else if (activeTab === "failed") {
      filtered = filtered.filter(file => file.status === "failed");
    }
    
    // Apply status filter if selected
    if (statusFilter.length > 0) {
      filtered = filtered.filter(file => statusFilter.includes(file.status));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        file => 
          file.name.toLowerCase().includes(query) || 
          file.recipient.toLowerCase().includes(query)
      );
    }
    
    setFilteredFiles(filtered);
  };
  
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(current => {
      if (current.includes(status)) {
        return current.filter(s => s !== status);
      } else {
        return [...current, status];
      }
    });
  };
  
  const handleNewSchedule = (formData: ScheduleFormData) => {
    if (!formData.file) return;
    
    const newFile: FileItem = {
      id: `file-${files.length + 1}`,
      name: formData.file.name,
      size: formData.file.size,
      type: formData.file.type,
      recipient: formData.recipient,
      scheduledDate: formData.scheduledDate,
      status: "pending",
      createdAt: new Date()
    };
    
    setFiles(prev => [newFile, ...prev]);
    setIsDialogOpen(false);
  };
  
  const handleEditSchedule = (formData: ScheduleFormData) => {
    if (!formData.id) return;
    
    setFiles(prev => prev.map(file => {
      if (file.id === formData.id) {
        return {
          ...file,
          recipient: formData.recipient,
          scheduledDate: formData.scheduledDate
        };
      }
      return file;
    }));
    
    setEditingFile(null);
    setIsDialogOpen(false);
  };
  
  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };
  
  const handleEditFile = (id: string) => {
    const fileToEdit = files.find(file => file.id === id);
    if (fileToEdit) {
      setEditingFile(fileToEdit);
      setIsDialogOpen(true);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="container-custom pt-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">File Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage and schedule your file deliveries</p>
          </div>
          
          <Button 
            onClick={() => {
              setEditingFile(null);
              setIsDialogOpen(true);
            }} 
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" /> 
            Schedule New File
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files or recipients..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {statusFilter.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {statusFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("pending")}
                onCheckedChange={() => handleStatusFilterChange("pending")}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("sent")}
                onCheckedChange={() => handleStatusFilterChange("sent")}
              >
                Sent
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("failed")}
                onCheckedChange={() => handleStatusFilterChange("failed")}
              >
                Failed
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm font-normal"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
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
                  onClick={() => {
                    setEditingFile(null);
                    setIsDialogOpen(true);
                  }}
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
                    onDelete={handleDeleteFile}
                    onEdit={handleEditFile}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingFile ? "Edit Scheduled File" : "Schedule New File"}
            </DialogTitle>
          </DialogHeader>
          <ScheduleForm 
            onSubmit={editingFile ? handleEditSchedule : handleNewSchedule}
            editingFile={editingFile ? {
              id: editingFile.id,
              name: editingFile.name,
              recipient: editingFile.recipient,
              scheduledDate: editingFile.scheduledDate
            } : null}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
