import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import { GeneratedPdfResult } from '../utils/pdfPlanExport';

interface PdfExportModalProps {
  result: GeneratedPdfResult;
  userName: string;
  onClose: () => void;
}

export function PdfExportModal({ result, userName, onClose }: PdfExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Listen for flutter-back (iOS back swipe)
  useEffect(() => {
    const handler = () => {
      if (showPreview) setShowPreview(false);
      else onClose();
    };
    window.addEventListener('flutter-back', handler);
    return () => window.removeEventListener('flutter-back', handler);
  }, [showPreview, onClose]);

  const handleShareNative = async () => {
    setSharing(true);
    try {
      if (
        navigator.canShare &&
        navigator.canShare({ files: [result.file] })
      ) {
        await navigator.share({
          files: [result.file],
          title: 'Plan Personal Mi Salud Pro',
          text: `Plan de salud y entrenamiento de ${userName} generado en Mi Salud Pro.`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'Plan Personal Mi Salud Pro',
          text: `Plan de salud y entrenamiento de ${userName}.`,
        });
      } else {
        // Fallback: download
        handleDownloadSafe();
      }
    } catch (err) {
      // User cancelled share or share not supported
      if ((err as Error)?.name !== 'AbortError') {
        handleDownloadSafe();
      }
    } finally {
      setSharing(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola! Te comparto mi plan de salud y entrenamiento personal de Mi Salud Pro para ${userName}.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleDownloadSafe = () => {
    try {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      result.download();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col justify-end sm:justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="apple-glass-elevated w-full max-w-md rounded-[32px] p-5 space-y-4 max-h-[90vh] overflow-y-auto mx-auto shadow-2xl shadow-black/80">
        {/* Top Header with Back Button */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
            aria-label="Volver atrás"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-bold text-white">
            Plan Personal (PDF)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#8E9D93] hover:text-white cursor-pointer active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Document Card */}
        <div className="apple-glass-card rounded-[28px] p-4.5 space-y-3.5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF453A] flex items-center justify-center mx-auto shadow-lg shadow-[#FF453A]/20">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-lg font-extrabold text-white">
              Plan Completo de Salud
            </h3>
            <p className="text-xs text-[#C5D0C8]">
              Rutinas, nutrición, calorías, medidas y lista de compras
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/6 text-[11px] font-mono-nums text-[#8E9D93] mt-1">
              <span>{result.totalPages} páginas</span>
              <span>·</span>
              <span>{result.fileName}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main Share Button (Opens iOS Native Share Sheet for WhatsApp, AirDrop, etc.) */}
          <button
            type="button"
            onClick={handleShareNative}
            disabled={sharing}
            className="w-full min-h-[50px] rounded-2xl bg-[#74D834] text-[#081007] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#82E63E] active:scale-[0.98] transition-all shadow-lg shadow-[#74D834]/25"
          >
            <Share2 className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Compartir (WhatsApp, AirDrop, etc.)</span>
          </button>

          {/* Direct Download Button */}
          <button
            type="button"
            onClick={handleDownloadSafe}
            className="w-full min-h-[46px] rounded-2xl apple-glass-pill text-white font-display font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all border border-white/15"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#74D834]" />
                <span className="text-[#74D834]">¡Descargado con éxito!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#74D834]" />
                <span>Descargar en el dispositivo</span>
              </>
            )}
          </button>

          {/* Toggle PDF Preview */}
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="w-full py-2.5 text-center text-xs font-medium text-[#8E9D93] hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Ocultar vista previa' : 'Ver documento completo'}</span>
          </button>
        </div>

        {/* Embedded Safe Preview */}
        {showPreview && (
          <div className="rounded-2xl overflow-hidden border border-white/15 bg-black h-80 relative animate-in fade-in duration-200">
            <iframe
              src={result.dataUri}
              title="Vista previa del PDF"
              className="w-full h-full border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
