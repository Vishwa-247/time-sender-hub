
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Create a Supabase client with the Deno runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get the app URL (fallback for localhost development)
const APP_URL = Deno.env.get("APP_URL") || "https://timecapsule.vercel.app";

// Function to send an email (simplified for demonstration)
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`BODY: ${body}`);
  
  // In a real-world scenario, you would integrate with an email service like SendGrid, Mailgun, etc.
  // For now, we'll just simulate success
  return true;
}

async function processScheduledFiles() {
  console.log("Processing scheduled files...");
  
  try {
    // Get current timestamp
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    
    // Fetch files ready to be sent (scheduled_date <= now AND status = 'pending')
    const { data: files, error } = await supabase
      .from("scheduled_files")
      .select("*")
      .lte("scheduled_date", now.toISOString())
      .eq("status", "pending");
      
    if (error) {
      console.error("Error fetching scheduled files:", error);
      throw error;
    }
    
    console.log(`Found ${files?.length || 0} files to process`);
    
    if (!files || files.length === 0) {
      return { processed: 0, message: "No files ready to be sent" };
    }
    
    // Process each file
    const results = await Promise.all((files || []).map(async (file) => {
      try {
        console.log(`Processing file: ${file.id} - ${file.file_name} to ${file.recipient_email}`);
        
        // Generate access URL - use a safe fallback in case APP_URL isn't set
        const baseUrl = APP_URL || "https://timecapsule.vercel.app";
        const accessUrl = `${baseUrl}/access/${file.access_token}`;
        
        console.log(`Generated access URL: ${accessUrl}`);
        
        // Send email with file access link
        const emailSent = await sendEmail(
          file.recipient_email,
          `Your scheduled file "${file.file_name}" is ready`,
          `Hello,<br><br>Your scheduled file "${file.file_name}" is now available. Click the link below to access it:<br><br><a href="${accessUrl}">${accessUrl}</a><br><br>This link will expire in 24 hours.<br><br>Regards,<br>TimeCapsule Team`
        );
        
        if (emailSent) {
          // Update file status to 'sent'
          const { error: updateError } = await supabase
            .from("scheduled_files")
            .update({ status: "sent" })
            .eq("id", file.id);
            
          if (updateError) {
            console.error(`Error updating file status: ${updateError.message}`);
            return { id: file.id, success: false, error: updateError.message };
          }
          
          console.log(`File ${file.id} processed successfully`);
          return { id: file.id, success: true };
        } else {
          // Handle email sending failure
          const { error: updateError } = await supabase
            .from("scheduled_files")
            .update({ status: "failed" })
            .eq("id", file.id);
            
          console.error(`Failed to send email for file ${file.id}`);
          return { id: file.id, success: false, error: "Failed to send email" };
        }
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
        
        // Update file status to 'failed'
        try {
          await supabase
            .from("scheduled_files")
            .update({ status: "failed" })
            .eq("id", file.id);
        } catch (updateError) {
          console.error(`Error updating file status to failed:`, updateError);
        }
        
        return { id: file.id, success: false, error: error.message || "Unknown error" };
      }
    }));
    
    return {
      processed: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    };
  } catch (error) {
    console.error("Error in processScheduledFiles:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Running scheduled file sending process...");
    
    const result = await processScheduledFiles();
    
    console.log("Processing complete. Result:", JSON.stringify(result));
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
