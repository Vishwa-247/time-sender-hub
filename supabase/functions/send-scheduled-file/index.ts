
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

// Function to send an email using Resend API
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`BODY: ${body}`);
  console.log(`APP_URL being used: ${APP_URL}`);
  
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set in environment variables");
    return false;
  }
  
  console.log("RESEND_API_KEY exists (first 4 chars):", RESEND_API_KEY.substring(0, 4) + "...");
  
  try {
    // Make sure we have a valid email address
    if (!to || !to.includes('@')) {
      console.error("Invalid recipient email address:", to);
      return false;
    }

    console.log("Attempting to send email via Resend API...");
    
    // Use the configured sender details from Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "TimeCapsule <team@timecapsule.example.com>",
        to: [to],
        subject: subject,
        html: body,
      })
    });
    
    // Log full response for debugging
    console.log("Resend API response status:", response.status);
    const responseText = await response.text();
    console.log("Resend API response body:", responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      result = { error: "Failed to parse response" };
    }
    
    console.log("Email API parsed response:", JSON.stringify(result));
    
    if (!response.ok) {
      console.error("Email sending failed with status:", response.status);
      console.error("Error details:", JSON.stringify(result));
      
      // If this failed, try falling back to the onboarding address
      if (response.status === 400 && (result?.error?.includes("domain") || responseText.includes("domain"))) {
        console.log("Domain verification issue. Trying with onboarding@resend.dev...");
        
        const fallbackResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: "TimeCapsule <onboarding@resend.dev>",
            to: [to],
            subject: subject,
            html: body,
          })
        });
        
        if (fallbackResponse.ok) {
          console.log("Email sent successfully with fallback address!");
          return true;
        } else {
          console.error("Fallback email sending also failed");
          return false;
        }
      }
      
      return false;
    }
    
    console.log("Email sent successfully!");
    return true;
  } catch (error) {
    console.error("Exception during email sending:", error);
    return false;
  }
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
    
    console.log(`Found ${files?.length || 0} files to process`, files);
    
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
    console.log("Environment check - APP_URL:", APP_URL);
    console.log("RESEND_API_KEY exists:", !!Deno.env.get("RESEND_API_KEY"));
    
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
