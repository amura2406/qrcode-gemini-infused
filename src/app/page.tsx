
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { QrContentDisplay } from '@/components/qr-content-display';
import { AppHeader } from '@/components/app-header';
import { generateTitleAction } from '@/lib/actions';
import { ScanLine, RotateCcw, Loader2, AlertCircle, VideoOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import jsQR from "jsqr";
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Keep for general errors

export default function HomePage() {
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); // null: pending, true: granted, false: denied/error
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              // Camera is ready and metadata (like dimensions) is loaded
              setHasCameraPermission(true);
            };
            videoRef.current.onerror = () => {
                setError("Video element error. Cannot play camera stream.");
                setHasCameraPermission(false);
                 toast({
                    variant: 'destructive',
                    title: 'Camera Stream Error',
                    description: 'There was an error with the camera stream.',
                });
            }
          } else {
             setError("Video element reference not found. Cannot start camera.");
             setHasCameraPermission(false);
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
         toast({
            variant: 'destructive',
            title: 'Camera Not Supported',
            description: message,
          });
      }
    };

    // Ensure videoRef is available before calling getCameraPermission
    if (videoRef.current) {
        getCameraPermission();
    } else {
        // This case should ideally not happen if video tag is always rendered
        // Small delay to allow videoRef to be set after initial render
        const timer = setTimeout(() => {
            if (videoRef.current) {
                 getCameraPermission();
            } else {
                setError("Failed to initialize camera: Video element not found after delay.");
                setHasCameraPermission(false);
            }
        }, 100);
        return () => clearTimeout(timer);
    }


    return () => {
      // Stop the camera stream when the component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]); // Only re-run if toast changes (which is unlikely and stable)

  const handleScanFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current || hasCameraPermission !== true) {
      setError("Camera not ready or permission not granted.");
      toast({
        title: "Scan Error",
        description: "Camera not ready or permission not granted.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsScanning(true);
    setError(null);
    setQrContent(null);
    setAiTitle(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      setError("Could not get canvas context for QR decoding.");
      setIsLoading(false);
      setIsScanning(false);
      toast({
        title: "Scan Error",
        description: "Could not prepare for QR code scanning.",
        variant: "destructive",
      });
      return;
    }

    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is not ready yet (dimensions unavailable). Please wait a moment and try again.");
      toast({
        title: "Camera Not Fully Ready",
        description: "The camera is still initializing or dimensions are not available. Please try scanning again in a moment.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoading(false);
      setIsScanning(false);
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
        setQrContent(code.data);
        const titleResult = await generateTitleAction(code.data);
        if (titleResult.error) {
          setError(prevError => prevError ? `${prevError}. ${titleResult.error}` : titleResult.error);
          setAiTitle("Content Analysis");
        } else {
          setAiTitle(titleResult.title || "Content Analysis");
        }
      } else {
        setError("No QR code found in the current camera view, or it could not be read.");
        setQrContent(null);
        setAiTitle(null);
        toast({
          title: "Scan Failed",
          description: "No QR code detected. Try repositioning the camera or ensure the QR code is clear.",
          variant: "default",
          duration: 3000,
        });
      }
    } catch (jsqrError) {
      console.error("Error during jsQR decoding:", jsqrError);
      setError('An unexpected error occurred during QR code decoding.');
      setAiTitle("Content Analysis"); 
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setQrContent(null);
    setAiTitle(null);
    setError(null);
    setIsLoading(false);
    setIsScanning(false);
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
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4">
                  <VideoOff className="h-10 w-10 mb-3 text-destructive" />
                  <h3 className="text-lg font-semibold text-destructive mb-1 text-center">Camera Access Problem</h3>
                  <p className="text-sm text-center text-destructive/90">
                    {error || "Camera access was denied or is unavailable. Please check your browser settings and refresh the page."}
                  </p>
                </div>
              )}
              {isScanning && hasCameraPermission === true && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                </div>
              )}
               {hasCameraPermission === true && !isScanning && (
                 <div className="absolute inset-0 border-4 border-primary/50 rounded-md pointer-events-none animate-pulse" style={{animationDuration: '3s'}}></div>
               )}
            </div>
          </CardContent>
        </Card>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {error && !isLoading && !qrContent && hasCameraPermission !== false && (
            <div className="p-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0"/>
                {error}
            </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={handleScanFromCamera}
            disabled={hasCameraPermission !== true || isLoading || isScanning}
            className="w-full sm:flex-1 text-base py-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label="Scan QR Code from Camera"
          >
            {isLoading || isScanning ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ScanLine className="h-5 w-5 mr-2" />
            )}
            {isLoading || isScanning ? 'Scanning...' : 'Scan Current View'}
          </Button>
          {(qrContent || error || aiTitle) && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isLoading || isScanning}
              className="w-full sm:w-auto text-base py-6 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary shadow-sm transition-all duration-200 ease-in-out"
              aria-label="Reset results"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          )}
        </div>

        {(qrContent || isLoading || (error && !aiTitle && !qrContent && hasCameraPermission === true )) && <Separator className="my-6 bg-border/50" />}

        <QrContentDisplay
          content={qrContent}
          title={aiTitle}
          isLoading={isLoading && !qrContent} 
          error={!aiTitle && !isLoading && !qrContent && hasCameraPermission === true ? error : null}
        />
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} QR Info Reveal. All rights reserved.</p>
        <p className="mt-1">Powered by Next.js, jsQR & Firebase Genkit</p>
      </footer>
    </div>
  );

    