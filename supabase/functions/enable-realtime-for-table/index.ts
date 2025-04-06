
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Create a Supabase client with the auth role of service_role
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  {
    auth: { persistSession: false },
  }
);

// Set CORS headers for the response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { table_name } = await req.json();
    
    if (!table_name) {
      throw new Error("Missing table_name parameter");
    }
    
    console.log(`Enabling real-time updates for table: ${table_name}`);
    
    // 1. Set the replica identity to FULL for the table
    const { error: replicaError } = await supabaseAdmin.rpc(
      'alter_table_replica_identity',
      { table_name: table_name, replica_type: 'FULL' }
    );
    
    if (replicaError) {
      console.error("Error setting replica identity:", replicaError);
      throw replicaError;
    }
    
    // 2. Add the table to the supabase_realtime publication
    const { error: publicationError } = await supabaseAdmin.rpc(
      'add_table_to_publication',
      { table_name: table_name, publication_name: 'supabase_realtime' }
    );
    
    if (publicationError) {
      console.error("Error adding table to publication:", publicationError);
      throw publicationError;
    }
    
    console.log(`Successfully enabled real-time updates for table: ${table_name}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Real-time updates enabled for table: ${table_name}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error enabling real-time updates:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
