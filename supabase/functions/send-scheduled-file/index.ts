
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
        // Get the request URL to determine base URL for access links
        const baseUrl = new URL(req.url).origin;
        // Use the request origin if available, otherwise use the base URL from request
        const origin = req.headers.get("origin") || baseUrl;
        const accessUrl = `${origin}/access/${file.access_token}`;

        console.log(`Sending file ${file.file_name} to ${file.recipient_email}`);
        console.log(`Access URL: ${accessUrl}`);

        // Send email with link using Deno fetch API
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "TimeCapsule <onboarding@resend.dev>",
            to: file.recipient_email,
            subject: `Your scheduled file "${file.file_name}" is ready`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6;">Your Time Capsule file is ready!</h1>
                <p>The file you scheduled is now available to download:</p>
                <p><strong>${file.file_name}</strong></p>
                <div style="margin: 30px 0;">
                  <a href="${accessUrl}" 
                     style="background-color: #3b82f6; color: white; padding: 12px 20px; 
                            text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Access Your File
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  This link will give you access to your file. For security, don't share this link with others.
                </p>
              </div>
            `
          })
        });

        const emailResult = await emailResponse.json();
        console.log("Email sending result:", emailResult);

        if (!emailResponse.ok) {
          throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
        }

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
