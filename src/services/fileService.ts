
import { supabase } from "@/integrations/supabase/client";
import { FileItem } from "@/components/FileCard";
import { toast } from "sonner";

export interface ScheduleFileParams {
  file: File;
  recipient: string;
  scheduledDate: Date;
}

export interface UpdateScheduleParams {
  id: string;
  recipient: string;
  scheduledDate: Date;
}

export const uploadFile = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase
    .storage
    .from("timecapsule")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });
    
  if (error) {
    console.error("Error uploading file:", error);
    toast.error(`Failed to upload file: ${error.message}`);
    throw error;
  }
  
  return data.path;
};

export const scheduleFile = async (params: ScheduleFileParams): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("User not authenticated");
      throw new Error("User not authenticated");
    }
    
    const storagePath = await uploadFile(params.file, userData.user.id);
    const accessToken = crypto.randomUUID();
    
    const { error } = await supabase
      .from("scheduled_files")
      .insert({
        user_id: userData.user.id,
        file_name: params.file.name,
        file_size: params.file.size,
        file_type: params.file.type,
        storage_path: storagePath,
        recipient_email: params.recipient,
        scheduled_date: params.scheduledDate.toISOString(),
        access_token: accessToken,
      });
      
    if (error) {
      toast.error(`Failed to schedule file: ${error.message}`);
      throw error;
    }
    
    toast.success("File scheduled successfully");
  } catch (error: any) {
    console.error("Error scheduling file:", error);
    toast.error(`Error scheduling file: ${error.message}`);
    throw error;
  }
};

export const updateScheduledFile = async (params: UpdateScheduleParams): Promise<void> => {
  try {
    const { error } = await supabase
      .from("scheduled_files")
      .update({
        recipient_email: params.recipient,
        scheduled_date: params.scheduledDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
      
    if (error) {
      toast.error(`Failed to update schedule: ${error.message}`);
      throw error;
    }
    
    toast.success("Schedule updated successfully");
  } catch (error: any) {
    console.error("Error updating scheduled file:", error);
    toast.error(`Error updating scheduled file: ${error.message}`);
    throw error;
  }
};

export const deleteScheduledFile = async (id: string): Promise<void> => {
  try {
    // Get storage path before deleting the record
    const { data, error } = await supabase
      .from("scheduled_files")
      .select("storage_path")
      .eq("id", id)
      .single();
      
    if (error) {
      toast.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
    
    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from("timecapsule")
      .remove([data.storage_path]);
      
    if (storageError) {
      console.error("Error removing file from storage:", storageError);
      // Continue with the database deletion even if storage deletion fails
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from("scheduled_files")
      .delete()
      .eq("id", id);
      
    if (dbError) {
      toast.error(`Failed to delete record: ${dbError.message}`);
      throw dbError;
    }
    
    toast.success("File deleted successfully");
  } catch (error: any) {
    console.error("Error deleting scheduled file:", error);
    toast.error(`Error deleting scheduled file: ${error.message}`);
    throw error;
  }
};

export const getScheduledFiles = async (): Promise<FileItem[]> => {
  try {
    const { data, error } = await supabase
      .from("scheduled_files")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      toast.error(`Failed to fetch files: ${error.message}`);
      throw error;
    }
    
    return data.map((item: any) => ({
      id: item.id,
      name: item.file_name,
      size: item.file_size,
      type: item.file_type,
      recipient: item.recipient_email,
      scheduledDate: new Date(item.scheduled_date),
      status: item.status as "pending" | "sent" | "failed",
      createdAt: new Date(item.created_at)
    }));
  } catch (error: any) {
    console.error("Error fetching scheduled files:", error);
    toast.error(`Error fetching scheduled files: ${error.message}`);
    return [];
  }
};

export const getFileByToken = async (token: string): Promise<{
  fileName: string;
  fileType: string;
  fileUrl: string;
} | null> => {
  try {
    const { data, error } = await supabase
      .from("scheduled_files")
      .select("*")
      .eq("access_token", token)
      .eq("status", "sent")
      .single();
      
    if (error) {
      toast.error("Invalid or expired access token");
      return null;
    }
    
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from("timecapsule")
      .createSignedUrl(data.storage_path, 60 * 60); // 1 hour expiry
      
    if (fileError) {
      toast.error(`Failed to access file: ${fileError.message}`);
      return null;
    }
    
    return {
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: fileData?.signedUrl || ""
    };
  } catch (error: any) {
    console.error("Error fetching file by token:", error);
    toast.error(`Error accessing file: ${error.message}`);
    return null;
  }
};
