
import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchFiles();
    
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
          fetchFiles();
          
          if (payload.eventType === 'UPDATE' && 
              payload.new && payload.old && 
              payload.new.status === 'sent' && 
              payload.old.status === 'pending') {
            toast({
              title: "File Sent",
              description: `The file "${payload.new.file_name}" has been sent successfully.`,
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const data = await getScheduledFiles();
      setFiles(data);
      setFilteredFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to load your files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
      
      toast({
        title: "Success",
        description: "File scheduled successfully",
      });
      
      fetchFiles();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error scheduling file:", error);
      toast({
        title: "Error",
        description: "Failed to schedule file",
        variant: "destructive",
      });
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
      
      toast({
        title: "Success",
        description: "File schedule updated successfully",
      });
      
      fetchFiles();
      setEditingFile(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error updating file schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update file schedule",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteFile = async (id: string) => {
    try {
      await deleteScheduledFile(id);
      setFiles(prev => prev.filter(file => file.id !== id));
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
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
      await fetchFiles();
    } catch (error) {
      console.error("Error triggering file sending:", error);
      toast({
        title: "Error",
        description: "Failed to trigger file sending",
        variant: "destructive",
      });
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
