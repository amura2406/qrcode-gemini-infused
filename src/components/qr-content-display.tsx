"use client";

import type { FC } from 'react';
import { ClipboardCopy, Link as LinkIcon, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

interface QrContentDisplayProps {
  content: string | null;
  title: string | null;
  isLoading: boolean;
  error?: string | null;
}

export const QrContentDisplay: FC<QrContentDisplayProps> = ({ content, title, isLoading, error }) => {
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

  const isUrl = (text: string | null): boolean => {
    if (!text) return false;
    try {
      new URL(text);
      return text.startsWith('http://') || text.startsWith('https://');
    } catch (_) {
      return false;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      );
    }
    
    if (!content) {
       return <p className="text-muted-foreground">Scan a QR code to see its content here.</p>;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {isUrl(content) ? (
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
        {isUrl(content) ? (
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
      </div>
    );
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isLoading && !title ? <Skeleton className="h-8 w-1/2" /> : title || "QR Content"}
        </CardTitle>
        <CardDescription>
          {isLoading && !title ? <Skeleton className="h-4 w-1/3" /> : "Information extracted from the QR code."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};
