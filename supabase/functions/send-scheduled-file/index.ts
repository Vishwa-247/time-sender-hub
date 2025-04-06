
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

/**
 * Enable Postgres replication for the scheduled_files table
 */
async function enableRealtimeForScheduledFiles() {
  try {
    const { error } = await supabaseClient.rpc('supabase_functions.invoke', {
      name: 'enable-realtime-for-table',
      body: { table_name: 'scheduled_files' },
    });
    
    if (error) {
      console.error("Error enabling realtime for scheduled_files:", error);
    } else {
      console.log("Successfully enabled realtime for scheduled_files table");
    }
  } catch (error) {
    console.error("Error calling enable-realtime function:", error);
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
    
    // Fetch all pending scheduled files
    const { data: scheduledFiles, error: selectError } = await supabaseClient
      .from("scheduled_files")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_date", new Date().toISOString());

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
        
        // Generate access URL
        const accessUrl = generateAccessUrl(file.access_token);
        console.log(`Generated access URL: ${accessUrl}`);

        // Send email
        if (!RESEND_API_KEY) {
          throw new Error("Resend API key is missing.");
        }

        console.log(`Sending email to ${file.recipient_email}`);
        const emailResult = await sendEmail({
          to: file.recipient_email,
          subject: "Your TimeCapsule File is Ready!",
          body: `
            <p>Hello!</p>
            <p>Your TimeCapsule file is now available. You can access it via the following link:</p>
            <p><a href="${accessUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Access Your File</a></p>
            <p>If the button doesn't work, you can copy and paste this link in your browser:</p>
            <p>${accessUrl}</p>
            <p>Best regards,<br>TimeCapsule Team</p>
          `,
          apiKey: RESEND_API_KEY,
        });

        if (emailResult.error) {
          console.error(`Error sending email for file ${file.id}:`, emailResult.error);
          failedCount++;
          
          // Update file status to 'failed'
          try {
            const { error: updateError } = await supabaseClient
              .from("scheduled_files")
              .update({ 
                status: "failed", 
                error_message: emailResult.error.message || "Failed to send email"
              })
              .eq("id", file.id);

            if (updateError) {
              console.error(`Error updating file status to failed for file ${file.id}:`, updateError);
            }
          } catch (updateErr) {
            console.error(`Exception when updating status to failed for file ${file.id}:`, updateErr);
          }
        } else {
          // Update file status to 'sent'
          try {
            const { error: updateError } = await supabaseClient
              .from("scheduled_files")
              .update({ 
                status: "sent", 
                sent_at: new Date().toISOString(),
                email_id: emailResult.data?.id || null
              })
              .eq("id", file.id);

            if (updateError) {
              console.error(`Error updating file status for file ${file.id}:`, updateError);
              failedCount++;
            } else {
              successCount++;
              console.log(`Successfully sent file ${file.id} to ${file.recipient_email}`);
            }
          } catch (updateErr) {
            console.error(`Exception when updating status to sent for file ${file.id}:`, updateErr);
            failedCount++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing file ${file.id}:`, error);
        failedCount++;

        // Update file status to 'failed'
        try {
          const { error: updateError } = await supabaseClient
            .from("scheduled_files")
            .update({ 
              status: "failed",
              error_message: error.message || "Unknown error occurred"
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
      return { data: null, error: data };
    }

    console.log("Email sent successfully with response:", data);
    return { data: data, error: null };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Handle the request
 */
serve(async (req) => {
  // Set CORS headers for the response
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
