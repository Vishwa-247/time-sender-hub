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

// Get the app URL for the correct access link - IMPORTANT: Set this in Supabase Edge Function Secrets
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:8080";
console.log(`Using APP_URL: ${APP_URL}`);

// Ensure Resend API key is available
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables");
}

/**
 * Service handler to process scheduled files
 */
async function processScheduledFiles(): Promise<{ success: number; failed: number; processed: number }> {
  let successCount = 0;
  let failedCount = 0;
  let processedCount = 0;

  try {
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

    processedCount = scheduledFiles.length;

    // Process each scheduled file
    for (const file of scheduledFiles) {
      try {
        // Generate access URL
        const accessUrl = generateAccessUrl(file.access_token);

        // Send email
        if (!RESEND_API_KEY) {
          throw new Error("Resend API key is missing.");
        }

        const emailResult = await sendEmail({
          to: file.recipient_email,
          subject: "Your TimeCapsule File is Ready!",
          body: `
            <p>Hello!</p>
            <p>Your TimeCapsule file is now available. You can access it via the following link:</p>
            <a href="${accessUrl}">${accessUrl}</a>
            <p>This link will grant access to the file.</p>
          `,
          apiKey: RESEND_API_KEY,
        });

        if (emailResult.error) {
          console.error(`Error sending email for file ${file.id}:`, emailResult.error);
          failedCount++;
        } else {
          // Update file status to 'sent'
          const { error: updateError } = await supabaseClient
            .from("scheduled_files")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", file.id);

          if (updateError) {
            console.error(`Error updating file status for file ${file.id}:`, updateError);
            failedCount++;
          } else {
            successCount++;
            console.log(`Successfully sent file ${file.id} to ${file.recipient_email}`);
          }
        }
      } catch (error: any) {
        console.error(`Error processing file ${file.id}:`, error);
        failedCount++;

        // Optionally, update file status to 'failed'
        const { error: updateError } = await supabaseClient
          .from("scheduled_files")
          .update({ status: "failed" })
          .eq("id", file.id);

        if (updateError) {
          console.error(`Error updating file status to failed for file ${file.id}:`, updateError);
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
  // Make sure the URL doesn't have double slashes between domain and path
  const baseUrl = APP_URL.endsWith('/') ? APP_URL.slice(0, -1) : APP_URL;
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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "TimeCapsule <noreply@timecapsule.lol>",
        to: [to],
        subject: subject,
        html: body,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", data);
      return { data: null, error: data };
    }

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
