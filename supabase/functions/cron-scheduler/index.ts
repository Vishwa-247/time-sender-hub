
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Socket.io server instance
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["authorization, x-client-info, apikey, content-type"],
    credentials: true
  }
});

// Store connected clients
const connectedClients = new Set();

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  connectedClients.add(socket.id);

  // Listen for disconnect events
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    connectedClients.delete(socket.id);
  });

  // Listen for manual trigger requests from clients
  socket.on("trigger-file-sending", async () => {
    console.log("Manual trigger requested by client:", socket.id);
    try {
      const result = await processPendingFiles();
      socket.emit("file-sending-result", result);
    } catch (error) {
      console.error("Error processing manual trigger:", error);
      socket.emit("file-sending-error", { message: error.message });
    }
  });
});

// Process pending files function
async function processPendingFiles() {
  const currentTime = new Date();
  console.log("Processing pending files at:", currentTime.toISOString());
  
  // Check if there are any pending files to send using UTC timezone comparison
  const { data: pendingFiles, error: countError } = await supabase
    .from("scheduled_files")
    .select("id, scheduled_date")
    .eq("status", "pending")
    .lte("scheduled_date", currentTime.toISOString());
  
  if (countError) {
    console.error("Error checking pending files:", countError);
    return { error: countError.message };
  }
  
  if (!pendingFiles || pendingFiles.length === 0) {
    console.log("No pending files found to process at this time");
    return { message: "No pending files to process", timestamp: new Date().toISOString() };
  }
  
  console.log(`Found ${pendingFiles.length} pending files to process:`, pendingFiles);
  
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

  // Broadcast results to all connected clients
  io.emit("files-processed", sendScheduledData);

  // If any files were processed, check for new pending files
  if (sendScheduledData && (sendScheduledData.success > 0 || sendScheduledData.failed > 0)) {
    // Give the database a moment to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if there are any new pending files that are ready to send
    const { data: newPendingFiles, error: newCountError } = await supabase
      .from("scheduled_files")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_date", new Date().toISOString());
      
    if (newCountError) {
      console.error("Error checking for new pending files:", newCountError);
    } else if (newPendingFiles && newPendingFiles.length > 0) {
      console.log(`Found ${newPendingFiles.length} new pending files that are ready to be sent`);
      
      // If we still have pending files, make one more call to process them
      if (newPendingFiles.length > 0) {
        console.log("Making a follow-up call to process remaining pending files");
        
        try {
          const followUpResponse = await fetch(functionsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            }
          });
          
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            console.log("Follow-up send scheduled function result:", followUpData);
            // Broadcast follow-up results to all connected clients
            io.emit("files-processed", followUpData);
            return { ...sendScheduledData, followUp: followUpData };
          } else {
            console.error("Follow-up call failed:", followUpResponse.status, followUpResponse.statusText);
          }
        } catch (followUpError) {
          console.error("Error in follow-up call:", followUpError);
        }
      }
    }
  }

  return sendScheduledData;
}

// Attach Socket.io to the server
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() === "websocket") {
    // Handle WebSocket connections for Socket.io
    return io.handleUpgrade(req);
  }

  // Handle regular HTTP requests
  try {
    // Automatically process pending files when the cron job triggers
    const result = await processPendingFiles();
    
    return new Response(
      JSON.stringify({
        message: "Cron job executed successfully",
        result,
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
