import type { ReactNode } from 'react';

export default function TourIcon({ children }: { readonly children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}
