
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { QrCodeUploader } from '@/components/qr-code-uploader';
import { QrContentDisplay } from '@/components/qr-content-display';
import { AppHeader } from '@/components/app-header';
import { generateTitleAction, decodeQrCodeAction } from '@/lib/actions';
import { ScanLine, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(Date.now());
  const { toast } = useToast();

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setImagePreview(null);
  }, [selectedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("File size exceeds 10MB. Please choose a smaller file.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setQrContent(null);
      setAiTitle(null);
      setError(null);
    }
  };

  const handleScanQrCode = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setQrContent(null);
    setAiTitle(null);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);

    reader.onload = async () => {
      const imageDataUri = reader.result as string;
      try {
        const decodeResult = await decodeQrCodeAction(imageDataUri);

        if (decodeResult.error) {
          setError(decodeResult.error);
          setIsLoading(false);
          return;
        }

        if (!decodeResult.content || decodeResult.content.trim() === "") {
          setError("No QR code found in the image, or it could not be read.");
          setQrContent(null);
          setAiTitle(null);
          setIsLoading(false);
          return;
        }
        
        setQrContent(decodeResult.content);

        // Generate AI Title
        const titleResult = await generateTitleAction(decodeResult.content);
        if (titleResult.error) {
          setError(titleResult.error); // Show error from title generation
          setAiTitle("Content Analysis"); // Fallback title
        } else {
          setAiTitle(titleResult.title || "Content Analysis");
        }
      } catch (e) {
        console.error("Error during QR scan or title generation:", e);
        setError('An unexpected error occurred during processing.');
        setAiTitle("Content Analysis"); // Fallback title
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read the selected file.");
      setIsLoading(false);
    };
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setQrContent(null);
    setAiTitle(null);
    setError(null);
    setIsLoading(false);
    setInputKey(Date.now());
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-background to-primary/10 pt-2 pb-12 px-4 selection:bg-primary/30 selection:text-primary-foreground">
      <AppHeader />
      <main className="w-full max-w-2xl space-y-8 mt-4">
        <QrCodeUploader
          onFileChange={handleFileChange}
          imagePreview={imagePreview}
          inputKey={inputKey}
          disabled={isLoading}
        />

        {error && !isLoading && (
            <div className="p-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0"/> 
                {error}
            </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={handleScanQrCode}
            disabled={!selectedFile || isLoading}
            className="w-full sm:flex-1 text-base py-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label="Scan QR Code"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ScanLine className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Processing...' : 'Reveal Info'}
          </Button>
          {(selectedFile || qrContent || error) && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isLoading}
              className="w-full sm:w-auto text-base py-6 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary shadow-sm transition-all duration-200 ease-in-out"
              aria-label="Reset selection and results"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          )}
        </div>
        
        {(qrContent || isLoading || (error && !aiTitle)) && <Separator className="my-6 bg-border/50" />}

        <QrContentDisplay
          content={qrContent}
          title={aiTitle}
          isLoading={isLoading}
          error={!aiTitle && !isLoading && !qrContent ? error : null} // Pass error if it's the primary reason for no content display
        />
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} QR Info Reveal. All rights reserved.</p>
        <p className="mt-1">Powered by Next.js & Firebase Genkit</p>
      </footer>
    </div>
  );
}
