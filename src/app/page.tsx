
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { QrContentDisplay } from '@/components/qr-content-display';
import { AppHeader } from '@/components/app-header';
import { generateTitleAction } from '@/lib/actions';
import { RotateCcw, Loader2, AlertCircle, VideoOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // True when fetching AI title
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isContinuousScanningActive, setIsContinuousScanningActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  const stopContinuousScanning = useCallback(() => {
    setIsContinuousScanningActive(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  const scanLoop = useCallback(async () => {
    if (!isContinuousScanningActive || isLoading || qrContent) {
      if (qrContent || isLoading) stopContinuousScanning(); // Stop if content found or loading AI title
      return;
    }

    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0) {
      if (isContinuousScanningActive) { // only request new frame if still active
          animationFrameIdRef.current = requestAnimationFrame(scanLoop);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      setError("Could not get canvas context for QR decoding.");
      stopContinuousScanning();
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        stopContinuousScanning(); // Found a QR code
        setQrContent(code.data);
        setIsLoading(true); // For AI title generation
        setError(null); // Clear previous errors

        const titleResult = await generateTitleAction(code.data);
        if (titleResult.error) {
          setError(titleResult.error);
          setAiTitle("Content Analysis"); // Default title on error
        } else {
          setAiTitle(titleResult.title || "Content Analysis");
        }
        setIsLoading(false);
      }
    } catch (jsqrError) {
      console.error("Error during jsQR decoding:", jsqrError);
      // Don't set page error for transient scan issues in continuous mode
      // setError('An unexpected error occurred during QR code decoding.'); 
    }

    if (isContinuousScanningActive && !qrContent && !isLoading) { // Check flags again before scheduling next frame
      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
  }, [isContinuousScanningActive, isLoading, qrContent, stopContinuousScanning]);


  const startContinuousScanning = useCallback(() => {
    if (hasCameraPermission && !isLoading && !qrContent) {
      setIsContinuousScanningActive(true);
      setError(null); // Clear errors before starting scan
      // Ensure previous animation frame is cancelled before starting a new one
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
  }, [hasCameraPermission, isLoading, qrContent, scanLoop]);


  useEffect(() => {
    const getCameraPermission = async () => {
      if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              setHasCameraPermission(true);
            };
            videoRef.current.onerror = () => {
                setError("Video element error. Cannot play camera stream.");
                setHasCameraPermission(false);
                stopContinuousScanning();
                 toast({
                    variant: 'destructive',
                    title: 'Camera Stream Error',
                    description: 'There was an error with the camera stream.',
                });
            }
          } else {
             setError("Video element reference not found. Cannot start camera.");
             setHasCameraPermission(false);
             stopContinuousScanning();
          }
        } catch (err) {
          console.error('Error accessing camera:', err);
          let message = 'Camera access denied. Please enable camera permissions in your browser settings.';
          if (err instanceof Error && err.name === "NotAllowedError") {
            message = "Camera permission was denied. Please enable it in your browser settings and refresh.";
          } else if (err instanceof Error && err.name === "NotFoundError") {
            message = "No camera found. Please ensure a camera is connected and enabled.";
          } else if (err instanceof Error) {
            message = `Error accessing camera: ${err.message}`;
          }
          setError(message);
          setHasCameraPermission(false);
          stopContinuousScanning();
          toast({
            variant: 'destructive',
            title: 'Camera Access Problem',
            description: message,
          });
        }
      } else {
        const message = "Camera access is not supported by this browser.";
        setError(message);
        setHasCameraPermission(false);
        stopContinuousScanning();
         toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: message,
          });
      }
    };

    if (videoRef.current) {
        getCameraPermission();
    } else {
        const timer = setTimeout(() => {
            if (videoRef.current) {
                 getCameraPermission();
            } else {
                setError("Failed to initialize camera: Video element not found after delay.");
                setHasCameraPermission(false);
                stopContinuousScanning();
            }
        }, 100);
        return () => clearTimeout(timer);
    }

    return () => {
      stopContinuousScanning();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast, stopContinuousScanning]); // Added stopContinuousScanning to dependencies

  useEffect(() => {
    if (hasCameraPermission && !qrContent && !isLoading) {
      startContinuousScanning();
    } else {
      stopContinuousScanning();
    }
  }, [hasCameraPermission, qrContent, isLoading, startContinuousScanning, stopContinuousScanning]);


  const handleReset = () => {
    stopContinuousScanning(); // Stop any current scanning
    setQrContent(null);
    setAiTitle(null);
    setError(null);
    setIsLoading(false);
    // Restart scanning if camera is available
    if (hasCameraPermission) {
        startContinuousScanning();
    }
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-background to-primary/10 pt-2 pb-12 px-4 selection:bg-primary/30 selection:text-primary-foreground">
      <AppHeader />
      <main className="w-full max-w-2xl space-y-8 mt-4">
        <Card className="w-full shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden border border-primary/20">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline 
                muted
              />
              {hasCameraPermission === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 text-muted-foreground p-4">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-center">Requesting camera access...</p>
                </div>
              )}
              {hasCameraPermission === false && !error && ( // Show generic message if no specific error
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4">
                  <VideoOff className="h-10 w-10 mb-3 text-destructive" />
                  <h3 className="text-lg font-semibold text-destructive mb-1 text-center">Camera Unavailable</h3>
                  <p className="text-sm text-center text-destructive/90">
                    Camera access is not available. Please check settings.
                  </p>
                </div>
              )}
               {hasCameraPermission === false && error && ( // Show specific error if available
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4">
                  <VideoOff className="h-10 w-10 mb-3 text-destructive" />
                  <h3 className="text-lg font-semibold text-destructive mb-1 text-center">Camera Access Problem</h3>
                  <p className="text-sm text-center text-destructive/90">
                    {error}
                  </p>
                </div>
              )}
              {isLoading && hasCameraPermission === true && ( // Loading AI title
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                  <p className="text-white ml-3">Analyzing content...</p>
                </div>
              )}
               {hasCameraPermission === true && isContinuousScanningActive && !qrContent && !isLoading && (
                 <div className="absolute inset-0 border-4 border-primary/50 rounded-md pointer-events-none animate-pulse" style={{animationDuration: '2s'}}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/50 text-white text-xs rounded-md">Scanning...</div>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {error && !isLoading && hasCameraPermission === true && ( // Display general errors if AI is not loading and camera had permission
             // This error display will show AI errors or persistent camera errors not covered by the video overlay
            <div className="p-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0"/>
                {error}
            </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {(qrContent || aiTitle || error) && ( // Show reset button if there's any result or error
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isLoading} // Disable only if AI is loading
              className="w-full text-base py-6 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary shadow-sm transition-all duration-200 ease-in-out"
              aria-label="Reset and scan again"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-5 w-5 mr-2" />
              )}
              {isLoading ? 'Processing...' : 'Clear & Rescan'}
            </Button>
          )}
        </div>

        {(qrContent || isLoading || (error && !aiTitle && !qrContent)) && <Separator className="my-6 bg-border/50" />}

        <QrContentDisplay
          content={qrContent}
          title={aiTitle}
          isLoading={isLoading && !qrContent} // QrContentDisplay loading is for initial AI title fetch after scan
          error={null} // Page level error handles display for AI errors now
        />
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} QR Info Reveal. All rights reserved.</p>
        <p className="mt-1">Powered by Next.js, jsQR & Firebase Genkit</p>
      </footer>
    </div>
  );
}
