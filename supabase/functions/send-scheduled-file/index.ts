
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "https://esm.sh/resend@0.16.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || "re_LRWu8oUW_9tBaMFXDvpeeadE3doRYQALJ";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      throw new Error('Missing Supabase environment variables');
    }

    console.log("Starting scheduled file sending with Resend API key:", 
      RESEND_API_KEY ? "API key is set" : "API key is missing");
    
    // Initialize Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const resend = new Resend(RESEND_API_KEY);

    // Get current date
    const now = new Date();
    const today = now.toISOString();

    console.log("Checking for files scheduled to be sent before:", today);

    // Query for files that are scheduled to be sent
    const { data: filesToSend, error: filesError } = await supabase
      .from('scheduled_files')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_date', today);
      
    if (filesError) {
      throw new Error(`Error fetching scheduled files: ${filesError.message}`);
    }
    
    console.log(`Found ${filesToSend?.length || 0} files to send`);
    
    const results = [];
    
    // For each file, generate a signed URL and send an email
    for (const file of filesToSend || []) {
      try {
        console.log(`Processing file: ${file.id} - ${file.file_name} to ${file.recipient_email}`);
        
        // Generate access URL - use the request URL to determine the base URL
        const baseUrl = new URL(req.url).origin;
        const accessUrl = `${baseUrl.replace("/functions/v1/send-scheduled-file", "")}/access/${file.access_token}`;
        
        console.log(`Generated access URL: ${accessUrl}`);
        
        // Send email
        const emailResult = await resend.emails.send({
          from: 'TimeCapsule <onboarding@resend.dev>',
          to: [file.recipient_email],
          subject: `You have a file delivery from TimeCapsule`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #3b82f6;">Your TimeCapsule File Is Ready</h1>
              <p>Hello,</p>
              <p>A file has been shared with you through TimeCapsule, and it's now ready for you to access.</p>
              <p><strong>File Name:</strong> ${file.file_name}</p>
              <p><strong>File Size:</strong> ${Math.round(file.file_size / 1024)} KB</p>
              <div style="margin: 30px 0;">
                <a href="${accessUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Access Your File
                </a>
              </div>
              <p style="opacity: 0.7; font-size: 14px;">This link will expire in 24 hours for security reasons.</p>
              <p style="opacity: 0.7; font-size: 14px;">TimeCapsule - Schedule files for future delivery</p>
            </div>
          `,
        });
        
        console.log(`Email sent for file ${file.id}:`, emailResult);
        
        // Update file status to sent
        const { error: updateError } = await supabase
          .from('scheduled_files')
          .update({
            status: 'sent',
            updated_at: now.toISOString()
          })
          .eq('id', file.id);
          
        if (updateError) {
          throw new Error(`Error updating file status: ${updateError.message}`);
        }
        
        results.push({
          fileId: file.id,
          status: 'sent',
          emailId: emailResult.id
        });
      } catch (fileError: any) {
        console.error(`Error processing file ${file.id}:`, fileError);
        
        // Update file status to failed
        await supabase
          .from('scheduled_files')
          .update({
            status: 'failed',
            updated_at: now.toISOString()
          })
          .eq('id', file.id);
          
        results.push({
          fileId: file.id,
          status: 'failed',
          error: fileError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-scheduled-file function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
