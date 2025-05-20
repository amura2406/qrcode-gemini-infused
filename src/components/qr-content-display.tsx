
"use client";

import type { FC } from 'react';
import { ClipboardCopy, Link as LinkIcon, ExternalLink, AlertCircle, FileText, Newspaper, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface QrContentDisplayProps {
  content: string | null;
  title: string | null;
  isTitleLoading: boolean;
  titleError?: string | null;
  webpageSummary?: string | null;
  isWebpageSummaryLoading?: boolean;
  webpageSummaryError?: string | null;
  isUrlContent?: boolean;
}

export const QrContentDisplay: FC<QrContentDisplayProps> = ({
  content,
  title,
  isTitleLoading,
  titleError,
  webpageSummary,
  isWebpageSummaryLoading,
  webpageSummaryError,
  isUrlContent = false,
}) => {
  const { toast } = useToast();

  const handleCopyToClipboard = () => {
    if (content) {
      navigator.clipboard.writeText(content)
        .then(() => {
          toast({ title: "Copied!", description: "QR content copied to clipboard.", duration: 3000 });
        })
        .catch(err => {
          console.error('Failed to copy content: ', err);
          toast({ variant: "destructive", title: "Error", description: "Could not copy content to clipboard." });
        });
    }
  };

  const renderMainContent = () => {
    if (isTitleLoading && !content) { // Initial loading state for title, before content is even set
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }
    
    if (!content && !isTitleLoading && !titleError) { // Default state, ready to scan
       return <p className="text-muted-foreground">Scan a QR code to see its content and AI analysis here.</p>;
    }

    if (!content && titleError) { // Error happened before content could be displayed (e.g. AI title error on empty content)
        return (
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{titleError}</p>
            </div>
          );
    }
    
    if (content) { // Content is available
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {isUrlContent ? (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> URL
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Text
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleCopyToClipboard} aria-label="Copy content to clipboard">
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            {isUrlContent ? (
              <a
                href={content}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline break-all transition-colors"
              >
                {content} <ExternalLink className="inline-block h-4 w-4 ml-1" />
              </a>
            ) : (
              <p className="whitespace-pre-wrap break-all text-foreground/90">{content}</p>
            )}
             {titleError && (
                <div className="flex items-center space-x-2 text-destructive pt-2">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs">Title Error: {titleError}</p>
                </div>
            )}
          </div>
        );
    }
    return null; // Fallback, should ideally be handled by above conditions
  };

  const renderWebpageSummary = () => {
    if (!isUrlContent || (!webpageSummary && !isWebpageSummaryLoading && !webpageSummaryError)) {
      return null; // Don't show this section if not a URL, or no data/loading/error for summary
    }

    return (
      <Accordion type="single" collapsible className="w-full mt-4">
        <AccordionItem value="webpage-summary">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <span>AI Webpage Summary</span>
              {isWebpageSummaryLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            {isWebpageSummaryLoading && !webpageSummary && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {webpageSummaryError && (
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{webpageSummaryError}</p>
              </div>
            )}
            {webpageSummary && !webpageSummaryError && (
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{webpageSummary}</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };
  
  const showCard = content || isTitleLoading || titleError || webpageSummary || isWebpageSummaryLoading || webpageSummaryError;

  if (!showCard) {
    return <p className="text-center text-muted-foreground py-4">Scan a QR code to begin.</p>;
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          {isTitleLoading && !title ? <Skeleton className="h-8 w-3/5" /> : title || "QR Content"}
          {isTitleLoading && title && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </CardTitle>
        <CardDescription>
          {isTitleLoading && !title ? <Skeleton className="h-4 w-2/5" /> : "Information extracted and analyzed from the QR code."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderMainContent()}
        {renderWebpageSummary()}
      </CardContent>
    </Card>
  );
};

