
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrContentDisplay } from '@/components/qr-content-display';
import { AppHeader } from '@/components/app-header';
import { generateTitleAction, summarizeWebpageAction, decodeQrCodeFromFrameAction } from '@/lib/actions';
import { Loader2, AlertCircle, VideoOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
// import jsQR from "jsqr";
import { Card, CardContent } from '@/components/ui/card';

const AUTO_RESET_DELAY = 10000; // 10 seconds

export default function HomePage() {
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [webpageSummary, setWebpageSummary] = useState<string | null>(null);
  
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSummarizingWebpage, setIsSummarizingWebpage] = useState(false);
  
  const [aiTitleError, setAiTitleError] = useState<string | null>(null);
  const [webpageSummaryError, setWebpageSummaryError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qrDetectionError, setQrDetectionError] = useState<string | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDetectingQrCode, setIsDetectingQrCode] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const isUrl = (text: string | null): boolean => {
    if (!text) return false;
    try {
      const parsedUrl = new URL(text);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const stopContinuousScanning = useCallback(() => {
    setIsScanningActive(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    stopContinuousScanning();
    setQrContent(null);
    setAiTitle(null);
    setWebpageSummary(null);
    setAiTitleError(null);
    setWebpageSummaryError(null);
    setQrDetectionError(null);
    // Don't clear cameraError unless it's a transient scanning error
    // setCameraError(null); 
    setIsDetectingQrCode(false);
    setIsGeneratingTitle(false);
    setIsSummarizingWebpage(false);
    if (hasCameraPermission) {
      startContinuousScanning();
    }
  }, [hasCameraPermission, stopContinuousScanning]); // startContinuousScanning will be defined below

  const scanLoop = useCallback(async () => {
    if (!isScanningActive || isDetectingQrCode || isGeneratingTitle || isSummarizingWebpage || qrContent) {
      if (qrContent || isDetectingQrCode || isGeneratingTitle || isSummarizingWebpage) stopContinuousScanning();
      return;
    }

    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0) {
      if (isScanningActive) {
          animationFrameIdRef.current = requestAnimationFrame(scanLoop);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      setCameraError("Could not get canvas context for QR decoding.");
      stopContinuousScanning();
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    setIsDetectingQrCode(true);
    setQrDetectionError(null);

    decodeQrCodeFromFrameAction(imageBase64).then(result => {
      if (result.qrData) {
        stopContinuousScanning();
        setQrContent(result.qrData);
        setCameraError(null); 
        setAiTitleError(null);
        setWebpageSummaryError(null);

        setIsGeneratingTitle(true);
        generateTitleAction(result.qrData).then(titleResult => {
          if (titleResult.error) {
            setAiTitleError(titleResult.error);
            setAiTitle("Content Analysis");
          } else {
            setAiTitle(titleResult.title || "Content Analysis");
          }
        }).finally(() => {
          setIsGeneratingTitle(false);
        });

        if (isUrl(result.qrData)) {
          setIsSummarizingWebpage(true);
          summarizeWebpageAction(result.qrData).then(summaryResult => {
            if (summaryResult.error) {
              setWebpageSummaryError(summaryResult.error);
              setWebpageSummary(null);
            } else {
              setWebpageSummary(summaryResult.summary || "No summary available.");
            }
          }).finally(() => {
            setIsSummarizingWebpage(false);
          });
        }
      } else if (result.error) {
        setQrDetectionError(result.error);
        setQrContent(null); // Stop further processing for this frame
        // Potentially stopContinuousScanning() here if AI errors are persistent or critical
      }
      // If no qrData and no error, the loop will continue if isScanningActive
    }).catch(error => {
      console.error("Error calling decodeQrCodeFromFrameAction:", error);
      setQrDetectionError("An unexpected error occurred while detecting QR code.");
      setQrContent(null);
    }).finally(() => {
      setIsDetectingQrCode(false);
    });

    if (isScanningActive && !qrContent && !isDetectingQrCode && !isGeneratingTitle && !isSummarizingWebpage) {
      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
  }, [isScanningActive, isDetectingQrCode, isGeneratingTitle, isSummarizingWebpage, qrContent, stopContinuousScanning]);


  const startContinuousScanning = useCallback(() => {
    if (hasCameraPermission && !isDetectingQrCode && !isGeneratingTitle && !isSummarizingWebpage && !qrContent) {
      setIsScanningActive(true);
      // setCameraError(null); // Clear errors before starting scan only if not a permission error
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
  }, [hasCameraPermission, isGeneratingTitle, isSummarizingWebpage, qrContent, scanLoop]);

  // Effect for camera permission and setup
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
              setCameraError(null); // Clear previous errors like "No camera found"
            };
            videoRef.current.onerror = () => {
                setCameraError("Video element error. Cannot play camera stream.");
                setHasCameraPermission(false);
                stopContinuousScanning();
                 toast({
                    variant: 'destructive',
                    title: 'Camera Stream Error',
                    description: 'There was an error with the camera stream.',
                });
            }
          } else {
             setCameraError("Video element reference not found. Cannot start camera.");
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
          setCameraError(message);
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
        setCameraError(message);
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
        // Retry initialization if videoRef is not immediately available
        const timer = setTimeout(() => {
            if (videoRef.current) {
                 getCameraPermission();
            } else if (hasCameraPermission === null) { // Only set error if still in initial loading state
                setCameraError("Failed to initialize camera: Video element not found after delay.");
                setHasCameraPermission(false);
                stopContinuousScanning();
            }
        }, 200);
        return () => clearTimeout(timer);
    }

    return () => {
      stopContinuousScanning();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, [toast, stopContinuousScanning, hasCameraPermission]);

  // Effect to start/stop scanning based on state
  useEffect(() => {
    if (hasCameraPermission && !qrContent && !isDetectingQrCode && !isGeneratingTitle && !isSummarizingWebpage) {
      startContinuousScanning();
    } else {
      stopContinuousScanning();
    }
  }, [hasCameraPermission, qrContent, isDetectingQrCode, isGeneratingTitle, isSummarizingWebpage, startContinuousScanning, stopContinuousScanning]);

  // Effect for auto-resetting
  useEffect(() => {
    if (qrContent && !isDetectingQrCode && !isGeneratingTitle && !isSummarizingWebpage) {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
      autoResetTimerRef.current = setTimeout(() => {
        handleReset();
      }, AUTO_RESET_DELAY);
    }
    return () => {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, [qrContent, isDetectingQrCode, isGeneratingTitle, isSummarizingWebpage, handleReset]);
  
  const anyLoading = isDetectingQrCode || isGeneratingTitle || isSummarizingWebpage;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-background to-primary/10 pt-2 pb-12 px-4 selection:bg-primary/30 selection:text-primary-foreground">
      <AppHeader />
      <main className="w-full max-w-2xl space-y-6 mt-4">
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
              {hasCameraPermission === false && cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10  p-4">
                  <VideoOff className="h-10 w-10 mb-3 text-destructive" />
                  <h3 className="text-lg font-semibold text-destructive mb-1 text-center">Camera Access Problem</h3>
                  <p className="text-sm text-center text-destructive/90">
                    {cameraError}
                  </p>
                </div>
              )}
              {hasCameraPermission === false && !cameraError && ( // Fallback if no specific camera error but permission is false
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4">
                    <VideoOff className="h-10 w-10 mb-3 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive mb-1 text-center">Camera Unavailable</h3>
                    <p className="text-sm text-center text-destructive/90">
                        Camera access is not available. Please check permissions and ensure a camera is connected.
                    </p>
                 </div>
              )}
              {anyLoading && hasCameraPermission === true && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                  <p className="text-white ml-3">
                    {isDetectingQrCode ? "Detecting QR Code..." : 
                     isGeneratingTitle && isSummarizingWebpage ? "Analyzing content & webpage..." : 
                     isGeneratingTitle ? "Analyzing content..." : 
                     isSummarizingWebpage ? "Summarizing webpage..." : "Processing..."}
                  </p>
                </div>
              )}
               {hasCameraPermission === true && isScanningActive && !qrContent && !anyLoading && (
                 <div className="absolute inset-0 border-4 border-primary/50 rounded-md pointer-events-none animate-pulse" style={{animationDuration: '2s'}}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/50 text-white text-xs rounded-md">Scanning...</div>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Display general errors not related to camera permission overlay, like AI errors */}
        { (qrDetectionError || aiTitleError || webpageSummaryError) && !anyLoading && (
            <div className="p-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0"/>
                <div>
                    {qrDetectionError && <p>{qrDetectionError}</p>}
                    {aiTitleError && <p>{aiTitleError}</p>}
                    {webpageSummaryError && <p>{webpageSummaryError}</p>}
                </div>
            </div>
        )}
        
        {(qrContent || anyLoading || qrDetectionError || aiTitleError || webpageSummaryError) && <Separator className="my-6 bg-border/50" />}

        <QrContentDisplay
          content={qrContent}
          title={aiTitle}
          isTitleLoading={isGeneratingTitle && !qrContent} // Only true if title is loading for the first time
          titleError={aiTitleError}
          webpageSummary={webpageSummary}
          isWebpageSummaryLoading={isSummarizingWebpage}
          webpageSummaryError={webpageSummaryError}
          isUrlContent={isUrl(qrContent)}
        />
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} QR Info Reveal. All rights reserved.</p>
        <p className="mt-1">Powered by Next.js, Gemini & Firebase Genkit</p>
      </footer>
    </div>
  );
}

