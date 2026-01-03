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
    
    // Dev environment with explicit port
    if (port) {
      return `${protocol}//${hostname}:${port}`;
    }
    
    // Localhost without port
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//localhost:3000`;
    }
    
    // Production: Return empty string to use relative URLs
    // Cloudflare Functions run at /_/functions/ on same domain
    return '';
  }
  
  return 'http://localhost:3000';
}
