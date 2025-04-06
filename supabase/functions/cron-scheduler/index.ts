
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Call the send-scheduled-file function
    const sendScheduledRes = await fetch(
      `${new URL(req.url).origin}/functions/v1/send-scheduled-file`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
      }
    );

    if (!sendScheduledRes.ok) {
      const errorText = await sendScheduledRes.text();
      console.error("Error calling send-scheduled-file:", errorText);
      throw new Error(`Failed to call send-scheduled-file: ${sendScheduledRes.status} ${errorText}`);
    }

    const sendScheduledData = await sendScheduledRes.json();
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
