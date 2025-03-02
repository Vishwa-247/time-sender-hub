
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current time
    const now = new Date();
    
    // Get files scheduled for now or in the past that haven't been sent yet
    const { data: filesToSend, error } = await supabaseAdmin
      .from("scheduled_files")
      .select("*")
      .lte("scheduled_date", now.toISOString())
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    console.log(`Found ${filesToSend?.length || 0} files to send`);

    // Process each file
    const processedFiles = [];
    
    for (const file of filesToSend || []) {
      try {
        // Generate signed URL for the file
        const { data: fileData } = await supabaseAdmin
          .storage
          .from("timecapsule")
          .createSignedUrl(file.storage_path, 60 * 60 * 24 * 7); // 7 days expiry

        if (!fileData?.signedUrl) {
          throw new Error(`Could not generate signed URL for file ${file.id}`);
        }

        // In a real-world scenario, you would send an email here
        // For now, we'll just log and update the status
        console.log(`Sending file ${file.file_name} to ${file.recipient_email}`);
        console.log(`Access URL: ${fileData.signedUrl}`);
        console.log(`Token: ${file.access_token}`);

        // Update file status to sent
        const { error: updateError } = await supabaseAdmin
          .from("scheduled_files")
          .update({ status: "sent" })
          .eq("id", file.id);

        if (updateError) {
          throw updateError;
        }

        processedFiles.push(file.id);
      } catch (fileError) {
        console.error(`Error processing file ${file.id}:`, fileError);
        
        // Update file status to failed
        await supabaseAdmin
          .from("scheduled_files")
          .update({ status: "failed" })
          .eq("id", file.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedFiles.length} files`,
        processed: processedFiles,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-scheduled-file function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
