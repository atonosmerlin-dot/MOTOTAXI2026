import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getServerOrigin() {
  const envOrigin = import.meta.env.VITE_SERVER_ORIGIN;
  if (envOrigin) return envOrigin;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = import.meta.env.VITE_SERVER_PORT;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || port) {
      const p = port || '3000';
      return `${protocol}//${hostname}:${p}`;
    }
    return `${protocol}//${hostname}`;
  }
  return 'http://localhost:3000';
}
