import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface Props {
  open?: boolean;
  onClose?: () => void;
}

// Scanner should only read QR and redirect; backend validates the point on /point/:id

const QRScanner: React.FC<Props> = ({ open, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stop = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setScanning(true);

        // Use BarcodeDetector if available
        const BarcodeDetector = (window as any).BarcodeDetector;
        const supportedFormats = BarcodeDetector ? (await (BarcodeDetector as any).getSupportedFormats?.() || []) : [];
        if (BarcodeDetector && supportedFormats.length) {
          const detector = new BarcodeDetector({ formats: supportedFormats });
          const detectLoop = async () => {
            if (stop) return;
            try {
              const barcodes = await detector.detect(videoRef.current!);
              if (barcodes && barcodes.length) {
                handleResult(barcodes[0].rawValue || barcodes[0].rawText);
                return;
              }
            } catch (e) {
              // ignore
            }
            requestAnimationFrame(detectLoop);
          };
          detectLoop();
        } else {
          // fallback: simple canvas scan using OffscreenCanvas not implemented here
          // so we poll with ImageCapture + decode via a library would be ideal.
          // As fallback, show message to user to open point URL manually.
          setError('Seu navegador não suporta leitura automática de QR. Por favor abra o link do QR manualmente.');
        }
      } catch (e:any) {
        console.error(e);
        setError('Não foi possível acessar a câmera. Verifique permissões.');
      }
    };

    start();

    return () => {
      stop = true;
      setScanning(false);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open]);

  const handleResult = async (text: string) => {
    // parse URL like https://app.dominio.com/ponto/{pointId} or token
    try {
      // Stop video
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
      }
    } catch (e) {}
    // Do not validate content here. Redirect based on content.
    const trimmed = (text || '').trim();

    // If it's an absolute URL, redirect the browser to it (external or internal).
    if (/^https?:\/\//i.test(trimmed)) {
      window.location.href = trimmed;
      return;
    }

    // token format: point:{id}
    if (trimmed.toLowerCase().startsWith('point:')) {
      const id = trimmed.split(':')[1];
      if (id) {
        navigate(`/point/${encodeURIComponent(id)}?locked=1`);
        onClose?.();
        return;
      }
    }

    // If it's a path-like string (e.g. /point/{id} or point/{id}), try to extract last segment
    try {
      const parts = trimmed.split('/').filter(Boolean);
      if (parts.length) {
        const last = parts[parts.length - 1];
        navigate(`/point/${encodeURIComponent(last)}?locked=1`);
        onClose?.();
        return;
      }
    } catch (e) {
      // fallback
    }

    // final fallback: treat whole content as id
    navigate(`/point/${encodeURIComponent(trimmed)}?locked=1`);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-card w-full max-w-md p-4 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Escanear QR Code</h3>
          <button onClick={() => onClose?.()} className="p-2"><X /></button>
        </div>
        <div className="w-full h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
        {error ? (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">Aponte a câmera para o QR Code do ponto.</div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
