import type { FC } from 'react';

export const AppHeader: FC = () => {
  return (
    <header className="py-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
        QR Info Reveal
      </h1>
      <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
        Upload a QR code image to see its content and get a smart title.
      </p>
    </header>
  );
};
