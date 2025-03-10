
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { File, Download, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileByToken } from "@/services/fileService";

const FileAccess = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState<{
    fileName: string;
    fileType: string;
    fileUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        if (!token) {
          setError("Invalid file link");
          setLoading(false);
          return;
        }

        const data = await getFileByToken(token);
        if (!data) {
          setError("File not found or access has expired");
        } else {
          setFileData(data);
        }
      } catch (err) {
        console.error("Error fetching file:", err);
        setError("An error occurred while retrieving the file");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [token]);

  const getFileIcon = () => {
    if (!fileData) return null;
    
    if (fileData.fileType.includes("image")) {
      return (
        <div className="w-full max-w-md rounded-lg overflow-hidden shadow-lg mb-6">
          <img 
            src={fileData.fileUrl} 
            alt={fileData.fileName} 
            className="w-full h-auto"
          />
        </div>
      );
    }
    
    return (
      <div className="w-32 h-32 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
        <File className="h-16 w-16 text-primary" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-xl font-medium flex items-center space-x-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TimeCapsule
            </span>
          </Link>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading your file...</p>
            </div>
          ) : error ? (
            <div className="py-12 border border-dashed rounded-xl">
              <h2 className="text-2xl font-bold mb-4">Oops! {error}</h2>
              <p className="text-muted-foreground mb-6">
                The file you're looking for may have been removed or the link has expired.
              </p>
              <Button asChild>
                <Link to="/">Go to Home</Link>
              </Button>
            </div>
          ) : (
            <div className="py-12">
              <h2 className="text-2xl font-bold mb-2">Your file is ready!</h2>
              <p className="text-muted-foreground mb-8">
                You can now view or download the file.
              </p>
              
              <div className="flex flex-col items-center">
                {getFileIcon()}
                
                <h3 className="text-xl font-semibold mb-2">{fileData?.fileName}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {fileData?.fileType}
                </p>
                
                <Button asChild size="lg">
                  <a 
                    href={fileData?.fileUrl} 
                    download={fileData?.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download File
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FileAccess;
