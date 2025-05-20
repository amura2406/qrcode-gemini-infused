"use client";

import type { ChangeEvent, FC } from 'react';
import { UploadCloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QrCodeUploaderProps {
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  imagePreview: string | null;
  inputKey: number; // To reset the file input
  disabled?: boolean;
}

export const QrCodeUploader: FC<QrCodeUploaderProps> = ({
  onFileChange,
  imagePreview,
  inputKey,
  disabled = false,
}) => {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Upload QR Code</CardTitle>
        <CardDescription>Select an image file containing a QR code.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <label
            htmlFor="qr-file-input"
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
            ${disabled ? 'bg-muted/50 cursor-not-allowed' : 'border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20'}
            transition-colors duration-200 ease-in-out`}
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="QR Code Preview"
                className="object-contain h-full w-full p-2"
                data-ai-hint="qr code"
              />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className={`w-10 h-10 mb-3 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
                <p className={`mb-2 text-sm ${disabled ? 'text-muted-foreground' : 'text-foreground/80'}`}>
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className={`text-xs ${disabled ? 'text-muted-foreground' : 'text-foreground/60'}`}>
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            )}
            <Input
              id="qr-file-input"
              key={inputKey}
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
              onChange={onFileChange}
              disabled={disabled}
            />
          </label>
          <p className="text-xs text-center text-muted-foreground italic">
            Note: QR code reading is simulated for this demo. Actual decoding from the image is not implemented.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
