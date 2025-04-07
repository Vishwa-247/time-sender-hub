
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { FileItem } from "@/components/FileCard";
import { ScheduleFormData } from "@/components/ScheduleForm";
import { useAuth } from "@/context/AuthContext";
import { getScheduledFiles, scheduleFile, updateScheduledFile, deleteScheduledFile, triggerFileSending } from "@/services/fileService";
import { supabase } from "@/integrations/supabase/client";

// Import new components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FilterBar from "@/components/dashboard/FilterBar";
import StatusTabs from "@/components/dashboard/StatusTabs";
import ScheduleFileDialog from "@/components/dashboard/ScheduleFileDialog";

const Dashboard = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use a callback for fetchFiles to avoid recreation on every render
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching scheduled files");
      const data = await getScheduledFiles();
      console.log("Fetched files:", data);
      setFiles(data);
      setFilteredFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your files",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
    const cleanup = setupRealtimeSubscription();
    setupRefreshListener();
    
    // Check for files that need sending immediately on dashboard load
    const triggerInitialCheck = async () => {
      try {
        await triggerFileSending();
      } catch (error) {
        console.error("Error during initial file sending check:", error);
      }
    };
    
    triggerInitialCheck();
    
    return () => {
      // Cleanup will be handled by the returned function from setupRealtimeSubscription
      cleanup();
      window.removeEventListener('refresh-file-list', handleRefresh);
    };
  }, [fetchFiles]);
  
  const handleRefresh = useCallback(() => {
    console.log("Refresh file list triggered");
    fetchFiles();
  }, [fetchFiles]);
  
  const setupRefreshListener = () => {
    // Set up event listener for manual refresh requests
    window.addEventListener('refresh-file-list', handleRefresh);
  };
  
  const setupRealtimeSubscription = () => {
    console.log("Setting up realtime subscription for scheduled_files table");
    
    const channel = supabase
      .channel('scheduled_files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_files',
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Force refetch all files when any changes occur
          setTimeout(() => {
            console.log("Triggering fetch after realtime update");
            fetchFiles();
          }, 500); // Small delay to allow database to settle
          
          // Show toast notifications for status changes
          if (payload.eventType === 'UPDATE' && 
              payload.new && payload.old && 
              payload.new.status !== payload.old.status) {
            
            if (payload.new.status === 'sent' && 
                (payload.old.status === 'pending' || payload.old.status === 'processing')) {
              toast({
                title: "File Sent",
                description: `The file "${payload.new.file_name}" has been sent successfully.`,
                duration: 5000
              });
            } else if (payload.new.status === 'failed' && 
                      (payload.old.status === 'pending' || payload.old.status === 'processing')) {
              toast({
                variant: "destructive",
                title: "File Failed",
                description: `Failed to send file "${payload.new.file_name}". Please try again.`,
                duration: 5000
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    return () => {
      console.log('Removing realtime subscription');
      supabase.removeChannel(channel);
    };
  };
  
  useEffect(() => {
    filterFiles();
  }, [searchQuery, statusFilter, activeTab, files]);
  
  const filterFiles = () => {
    let filtered = [...files];
    
    if (activeTab === "pending") {
      filtered = filtered.filter(file => file.status === "pending");
    } else if (activeTab === "sent") {
      filtered = filtered.filter(file => file.status === "sent");
    } else if (activeTab === "failed") {
      filtered = filtered.filter(file => file.status === "failed");
    }
    
    if (statusFilter.length > 0) {
      filtered = filtered.filter(file => statusFilter.includes(file.status));
    }
    
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
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };
  
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
  };

  const handleNewSchedule = async (formData: ScheduleFormData) => {
    if (!formData.file) return;
    
    try {
      await scheduleFile({
        file: formData.file,
        recipient: formData.recipient,
        scheduledDate: formData.scheduledDate
      });
      
      setIsDialogOpen(false);
      // Fetch files after a small delay to ensure the new file is captured
      setTimeout(() => {
        fetchFiles();
      }, 500);
    } catch (error) {
      console.error("Error scheduling file:", error);
    }
  };
  
  const handleEditSchedule = async (formData: ScheduleFormData) => {
    if (!formData.id) return;
    
    try {
      await updateScheduledFile({
        id: formData.id,
        recipient: formData.recipient,
        scheduledDate: formData.scheduledDate
      });
      
      setEditingFile(null);
      setIsDialogOpen(false);
      // Fetch files after a small delay to ensure updates are reflected
      setTimeout(() => {
        fetchFiles();
      }, 500);
    } catch (error) {
      console.error("Error updating file schedule:", error);
    }
  };
  
  const handleDeleteFile = async (id: string) => {
    try {
      await deleteScheduledFile(id);
      setFiles(prev => prev.filter(file => file.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
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

  const handleManualTrigger = async () => {
    try {
      setIsLoading(true);
      await triggerFileSending();
      // Fetchfiles is automatically called by the event listener,
      // but we'll add a longer delay here to ensure database updates are synced
      setTimeout(() => {
        fetchFiles();
      }, 3000);
    } catch (error) {
      console.error("Error triggering file sending:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewScheduleDialog = () => {
    setEditingFile(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="container-custom pt-24">
        <DashboardHeader 
          onNewSchedule={openNewScheduleDialog} 
          onManualTrigger={handleManualTrigger}
          isLoading={isLoading}
        />
        
        <FilterBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          clearAllFilters={clearAllFilters}
        />
        
        <StatusTabs 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoading}
          filteredFiles={filteredFiles}
          onOpenDialog={openNewScheduleDialog}
          onDeleteFile={handleDeleteFile}
          onEditFile={handleEditFile}
        />
      </main>
      
      <ScheduleFileDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingFile ? handleEditSchedule : handleNewSchedule}
        editingFile={editingFile}
      />
    </div>
  );
};

export default Dashboard;
