
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log("Cron job triggered at:", new Date().toISOString());
    
    // Check if there are any pending emails to send
    const { data: pendingFiles, error: countError } = await supabase
      .from("scheduled_files")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_date", new Date().toISOString());
    
    if (countError) {
      console.error("Error checking pending files:", countError);
    } else {
      console.log(`Found ${pendingFiles?.length || 0} pending files to process`);
    }
    
    // Make a direct HTTP request to the send-scheduled-file function
    const functionsUrl = `${supabaseUrl}/functions/v1/send-scheduled-file`;
    console.log("Calling function at URL:", functionsUrl);
    
    const response = await fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from send-scheduled-file:", errorText);
      throw new Error(`Failed to call send-scheduled-file: ${response.status} ${response.statusText}`);
    }

    const sendScheduledData = await response.json();
    console.log("Send scheduled function result:", sendScheduledData);

    return new Response(
      JSON.stringify({
        message: "Cron job executed successfully",
        sendScheduledResult: sendScheduledData,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in cron-scheduler function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
