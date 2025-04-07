import { useState, useEffect, useCallback, useRef } from "react";
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

// Define types for payload
interface RealtimePayload {
  commit_timestamp: string;
  eventType: string;
  schema: string;
  table: string;
  new: {
    [key: string]: any;
    user_id?: string;
  };
  old?: {
    [key: string]: any;
    status?: string;
  };
}

const Dashboard = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const realtimeChannelRef = useRef<any>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const fetchAttemptRef = useRef(0);
  const hasUserCheckedRef = useRef(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const fetchFiles = useCallback(async () => {
    if (!user) {
      if (fetchAttemptRef.current > 5) {
        console.log("No user after multiple attempts, stopping fetch attempts");
        setIsLoading(false);
        return;
      }
      
      fetchAttemptRef.current += 1;
      console.log(`No user yet, attempt ${fetchAttemptRef.current}`);
      return;
    }
    
    hasUserCheckedRef.current = true;
    
    try {
      console.log("Fetching scheduled files");
      const data = await getScheduledFiles();
      console.log("Fetched files:", data);
      
      setFiles(data);
      setFilteredFiles(data);
      setInitialLoadComplete(true);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your files",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  const checkAndTriggerPendingFiles = useCallback(async () => {
    if (!user || !initialLoadComplete) return;
    
    try {
      const now = new Date();
      const pendingPastDue = files.filter(
        file => file.status === 'pending' && new Date(file.scheduledDate) <= now
      );
      
      if (pendingPastDue.length > 0) {
        console.log(`Found ${pendingPastDue.length} pending files past due, triggering send`);
        await triggerFileSending();
        setTimeout(() => {
          fetchFiles();
        }, 3000);
      }
    } catch (error) {
      console.error("Error checking pending files:", error);
    }
  }, [user, files, fetchFiles, initialLoadComplete]);

  const setupRealtimeSubscription = useCallback(() => {
    if (realtimeChannelRef.current) {
      console.log("Cleaning up existing realtime subscription");
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    if (!user) return;
    
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
        (payload: RealtimePayload) => {
          console.log('Real-time update received:', payload);
          
          const userId = payload.new?.user_id;
          
          if (userId && user && userId === user.id) {
            setTimeout(() => {
              console.log("Triggering fetch after realtime update");
              fetchFiles();
            }, 1000);
            
            if (payload.eventType === 'UPDATE' && 
                payload.new && payload.old && 
                payload.new.status !== payload.old.status) {
              
              if (payload.new.status === 'sent' && 
                  (payload.old.status === 'pending' || payload.old.status === 'processing')) {
                toast({
                  title: "File Sent",
                  description: `The file "${payload.new.file_name}" has been sent.`,
                  duration: 3000
                });
              } else if (payload.new.status === 'failed' && 
                        (payload.old.status === 'pending' || payload.old.status === 'processing')) {
                toast({
                  variant: "destructive",
                  title: "File Failed",
                  description: `Failed to send "${payload.new.file_name}".`,
                  duration: 3000
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
      
    realtimeChannelRef.current = channel;
  }, [fetchFiles, toast, user]);
  
  const setupRefreshListener = useCallback(() => {
    const handleRefresh = () => {
      console.log("Refresh file list triggered");
      fetchFiles();
    };
    
    window.addEventListener('refresh-file-list', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-file-list', handleRefresh);
    };
  }, [fetchFiles]);

  useEffect(() => {
    console.log("Main effect running, user:", user ? "exists" : "null");
    
    if (!isLoading && !hasUserCheckedRef.current && user) {
      console.log("User available but haven't loaded yet, starting load");
      setIsLoading(true);
    }
    
    if (isLoading && user) {
      fetchFiles();
    }
    
    return () => {
      if (realtimeChannelRef.current) {
        console.log("Removing realtime subscription");
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      
      if (refreshIntervalRef.current !== null) {
        console.log("Clearing refresh interval");
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user, isLoading, fetchFiles]);
  
  useEffect(() => {
    if (!user) return;
    
    const cleanupRealtime = setupRealtimeSubscription();
    const cleanupRefresh = setupRefreshListener();
    
    const initialCheckTimer = setTimeout(() => {
      checkAndTriggerPendingFiles();
    }, 2000);
    
    if (refreshIntervalRef.current === null) {
      refreshIntervalRef.current = window.setInterval(() => {
        console.log("Auto-refreshing file list to check for pending deliveries");
        checkAndTriggerPendingFiles();
      }, 30000);
    }
    
    return () => {
      clearTimeout(initialCheckTimer);
    };
  }, [user, setupRealtimeSubscription, setupRefreshListener, checkAndTriggerPendingFiles]);
  
  useEffect(() => {
    if (initialLoadComplete) {
      filterFiles();
    }
  }, [searchQuery, statusFilter, activeTab, files, initialLoadComplete]);
  
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
      setTimeout(() => {
        fetchFiles();
      }, 1000);
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
      setTimeout(() => {
        fetchFiles();
      }, 1000);
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
      setTimeout(() => {
        fetchFiles();
      }, 4000);
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
