
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Create a Supabase client with the auth role of service_role
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "https://limzhusojiirnsefkupe.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  {
    auth: { persistSession: false },
  }
);

// Get the app URL for the correct access link
// IMPORTANT: Set this in Supabase Edge Function Secrets
// This should be a public URL accessible to recipients, NEVER localhost
const APP_URL = Deno.env.get("APP_URL") || "https://limzhusojiirnsefkupe.lovable.app";
console.log(`Using APP_URL: ${APP_URL}`);

// Ensure Resend API key is available
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables");
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Enable Postgres replication for the scheduled_files table
 */
async function enableRealtimeForScheduledFiles() {
  try {
    const { error } = await supabaseClient.rpc('alter_table_replica_identity', {
      table_name: 'scheduled_files',
      replica_type: 'FULL'
    });
    
    if (error) {
      console.error("Error setting replica identity for scheduled_files:", error);
    } else {
      console.log("Successfully set replica identity for scheduled_files table");
    }
    
    const { error: pubError } = await supabaseClient.rpc('add_table_to_publication', {
      table_name: 'scheduled_files',
      publication_name: 'supabase_realtime'
    });
    
    if (pubError) {
      console.error("Error adding scheduled_files to publication:", pubError);
    } else {
      console.log("Successfully added scheduled_files to realtime publication");
    }
  } catch (error) {
    console.error("Error enabling realtime for scheduled_files:", error);
  }
}

/**
 * Service handler to process scheduled files
 */
async function processScheduledFiles(): Promise<{ success: number; failed: number; processed: number }> {
  let successCount = 0;
  let failedCount = 0;
  let processedCount = 0;

  try {
    console.log("Starting to process scheduled files at:", new Date().toISOString());
    console.log("Using APP_URL:", APP_URL); // Log the URL being used
    
    // Try to enable realtime for the scheduled_files table (if not already enabled)
    await enableRealtimeForScheduledFiles();
    
    // Fetch all pending scheduled files with timezone-aware comparison
    const currentUtcTime = new Date().toISOString();
    const { data: scheduledFiles, error: selectError } = await supabaseClient
      .from("scheduled_files")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_date", currentUtcTime);

    if (selectError) {
      console.error("Error fetching scheduled files:", selectError);
      return { success: 0, failed: 0, processed: 0 };
    }

    if (!scheduledFiles || scheduledFiles.length === 0) {
      console.log("No scheduled files found to process.");
      return { success: 0, failed: 0, processed: 0 };
    }

    console.log(`Found ${scheduledFiles.length} files to process:`, scheduledFiles.map(f => ({ id: f.id, email: f.recipient_email, date: f.scheduled_date })));
    processedCount = scheduledFiles.length;

    // Process each scheduled file
    for (const file of scheduledFiles) {
      try {
        console.log(`Processing file ${file.id} scheduled for ${file.scheduled_date} to ${file.recipient_email}`);
        
        // First, update the status to "processing" to prevent duplicate sending
        const { error: updateProcessingError } = await supabaseClient
          .from("scheduled_files")
          .update({ 
            status: "processing",
            updated_at: new Date().toISOString()
          })
          .eq("id", file.id)
          .eq("status", "pending"); // Only update if still pending
          
        if (updateProcessingError) {
          console.error(`Error updating file ${file.id} status to processing:`, updateProcessingError);
          // Continue anyway, but log the issue
        }
        
        // Generate access URL
        const accessUrl = generateAccessUrl(file.access_token);
        console.log(`Generated access URL: ${accessUrl}`);

        // Send email
        if (!RESEND_API_KEY) {
          throw new Error("Resend API key is missing.");
        }

        console.log(`Sending email to ${file.recipient_email}`);
        
        // Check if we're in development mode and warn about Resend's free tier limitations
        if (RESEND_API_KEY && RESEND_API_KEY.startsWith("re_")) {
          console.log("NOTICE: Using Resend free tier - emails can only be sent to verified addresses or domains.");
          console.log("For testing in development, consider setting the recipient to your own verified email address.");
        }
        
        // New improved email template
        const emailTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #4F46E5;">Time Capsule</h2>
            <p>Hi there,</p>
            <p>You've received a scheduled file through <strong>Time Capsule</strong>, a platform for sending important files at the right time.</p>
            <p>🔗 Click the link below to access your file:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${accessUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">👉 Access Your File</a>
            </div>
            <p>This file was scheduled to be sent to you by one of our users. If you were expecting something important, this is probably it.</p>
            <p>If you're having trouble accessing the file or the link has expired, please contact the sender.</p>
            <p>Thanks,<br>— The Time Capsule Team</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>If the button doesn't work, you can copy and paste this link in your browser: ${accessUrl}</p>
            </div>
          </div>
        `;
        
        const emailResult = await sendEmail({
          to: file.recipient_email,
          subject: "Your TimeCapsule File is Ready!",
          body: emailTemplate,
          apiKey: RESEND_API_KEY,
        });

        console.log("Email send result:", emailResult);

        if (emailResult.error) {
          console.error(`Error sending email for file ${file.id}:`, emailResult.error);
          
          // Special handling for Resend free tier limitation
          let errorMessage = emailResult.error.message || "Failed to send email";
          
          // Default to marking as failed
          let status = "failed";
          
          // If we have an email ID, it means the email was actually sent despite the API error
          if (emailResult.data && emailResult.data.id) {
            status = "sent";
            console.log(`Email appears to have been sent despite API error. ID: ${emailResult.data.id}`);
          }
          
          // If the error is about sending to unverified addresses on free tier
          if (emailResult.error.statusCode === 403 && 
              emailResult.error.message && 
              (emailResult.error.message.includes("can only send") || 
               emailResult.error.message.includes("unverified"))) {
            
            // For Resend free tier limitations, we may still have delivered the email
            if (!emailResult.data || !emailResult.data.id) {
              errorMessage = "Resend free tier limitation: Can only send to verified email addresses. " + 
                           "Either verify this recipient or upgrade your Resend account.";
            } else {
              // If we got an ID, the email was probably sent despite the error
              status = "sent";
              errorMessage = "Email delivered, but Resend reported a free tier limitation.";
            }
          }
          
          // Update file status based on our determination
          try {
            const updateData = { 
              status: status, 
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            };
            
            if (status === "sent") {
              updateData.sent_at = new Date().toISOString();
            }
            
            if (emailResult.data?.id) {
              updateData.email_id = emailResult.data.id;
            }
            
            const { error: updateError } = await supabaseClient
              .from("scheduled_files")
              .update(updateData)
              .eq("id", file.id);

            if (updateError) {
              console.error(`Error updating file status for file ${file.id}:`, updateError);
            } else {
              console.log(`Updated file ${file.id} status to ${status}`);
            }
          } catch (updateErr) {
            console.error(`Exception when updating status for file ${file.id}:`, updateErr);
          }
          
          if (status === "sent") {
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          // Email was definitely sent successfully
          console.log(`Email sent successfully for file ${file.id} with email ID: ${emailResult.data?.id || 'unknown'}`);
          
          // Update file status to 'sent'
          try {
            const updateData = { 
              status: "sent", 
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            if (emailResult.data?.id) {
              updateData.email_id = emailResult.data.id;
            }
            
            const { error: updateError } = await supabaseClient
              .from("scheduled_files")
              .update(updateData)
              .eq("id", file.id);

            if (updateError) {
              console.error(`Error updating file status for file ${file.id}:`, updateError);
              failedCount++;
            } else {
              successCount++;
              console.log(`Successfully updated file ${file.id} status to sent`);
            }
          } catch (updateErr) {
            console.error(`Exception when updating status to sent for file ${file.id}:`, updateErr);
            failedCount++;
          }
        }
        
        // Add a slight delay between processing files to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`Error processing file ${file.id}:`, error);
        failedCount++;

        // Update file status to 'failed'
        try {
          const { error: updateError } = await supabaseClient
            .from("scheduled_files")
            .update({ 
              status: "failed",
              error_message: error.message || "Unknown error occurred",
              updated_at: new Date().toISOString()
            })
            .eq("id", file.id);

          if (updateError) {
            console.error(`Error updating file status to failed for file ${file.id}:`, updateError);
          }
        } catch (updateErr) {
          console.error(`Exception when updating status to failed for file ${file.id}:`, updateErr);
        }
      }
    }

    // Force a slight delay before returning to ensure updates propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`Processed ${processedCount} files. Success: ${successCount}, Failed: ${failedCount}.`);
    return { success: successCount, failed: failedCount, processed: processedCount };
  } catch (error) {
    console.error("Error in processScheduledFiles:", error);
    return { success: 0, failed: processedCount, processed: processedCount };
  }
}

/**
 * Generate access URL for a file
 */
function generateAccessUrl(accessToken: string): string {
  // Make sure we're using a valid public URL, not localhost
  if (!APP_URL || APP_URL.includes('localhost')) {
    console.warn("WARNING: Using localhost URL which won't work for email recipients!");
  }
  
  // Make sure the URL doesn't have double slashes between domain and path
  const baseUrl = APP_URL.endsWith('/') ? APP_URL.slice(0, -1) : APP_URL;
  
  // Making sure we always use /access/ path in the URL
  return `${baseUrl}/access/${accessToken}`;
}

/**
 * Send email using Resend
 */
async function sendEmail({
  to,
  subject,
  body,
  apiKey,
}: {
  to: string;
  subject: string;
  body: string;
  apiKey: string;
}): Promise<{ data: any; error: any }> {
  try {
    console.log(`Sending email to ${to} using Resend...`);
    
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "TimeCapsule <onboarding@resend.dev>", // Using Resend's default domain
        to: [to],
        subject: subject,
        html: body,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Resend API error response:", data);
      
      // Special handling for when emails appear to be sent despite API errors
      // Resend sometimes returns errors but still delivers emails in free tier
      if (data && data.id && res.status === 403) {
        console.log(`Resend reported error but provided ID ${data.id}, message may have been sent`);
        return { 
          data: { id: data.id }, 
          error: {
            statusCode: res.status,
            message: data.message || "Free tier limitation, but message appears to be sent",
            details: data
          } 
        };
      }
      
      return { 
        data: null, 
        error: {
          statusCode: res.status,
          message: data.message || "Unknown error from Resend API",
          details: data
        } 
      };
    }

    console.log("Email sent successfully with response:", data);
    return { data: data, error: null };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { 
      data: null, 
      error: {
        statusCode: 500,
        message: error.message || "Unknown error occurred",
        stack: error.stack
      }
    };
  }
}

/**
 * Handle the request
 */
serve(async (req) => {
  // Set CORS headers for the response
  const headers = new Headers(corsHeaders);

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }

  try {
    console.log("Received request to send scheduled files at:", new Date().toISOString());
    const result = await processScheduledFiles();

    // Respond with the result
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error("Edge Function error:", error);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: headers,
    });
  }
});
