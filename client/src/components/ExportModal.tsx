import { useState } from "react";
import { X, FileText, File, Code, Download, Loader2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  insightId: number;
  title: string;
}

type ExportFormat = "pdf" | "markdown" | "plainText" | "html";

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

const formatOptions: FormatOption[] = [
  {
    id: "pdf",
    name: "PDF",
    description: "Premium styled document with ornate design",
    icon: <FileText className="w-5 h-5" />,
    extension: ".pdf",
  },
  {
    id: "markdown",
    name: "Markdown",
    description: "Portable text format for notes and docs",
    icon: <File className="w-5 h-5" />,
    extension: ".md",
  },
  {
    id: "plainText",
    name: "Plain Text",
    description: "Simple text without formatting",
    icon: <FileText className="w-5 h-5" />,
    extension: ".txt",
  },
  {
    id: "html",
    name: "HTML",
    description: "Web page with full styling",
    icon: <Code className="w-5 h-5" />,
    extension: ".html",
  },
];

export function ExportModal({ isOpen, onClose, insightId, title }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const pdfExport = trpc.export.pdf.useMutation();
  const markdownExport = trpc.export.markdown.useMutation();
  const plainTextExport = trpc.export.plainText.useMutation();
  const htmlExport = trpc.export.html.useMutation();

  const handleExport = async () => {
    setExportStatus("exporting");
    
    try {
      let result: { pdfUrl?: string; markdownUrl?: string; textUrl?: string; htmlUrl?: string };
      
      switch (selectedFormat) {
        case "pdf":
          result = await pdfExport.mutateAsync({ insightId });
          setDownloadUrl(result.pdfUrl || null);
          break;
        case "markdown":
          result = await markdownExport.mutateAsync({ insightId });
          setDownloadUrl(result.markdownUrl || null);
          break;
        case "plainText":
          result = await plainTextExport.mutateAsync({ insightId });
          setDownloadUrl(result.textUrl || null);
          break;
        case "html":
          result = await htmlExport.mutateAsync({ insightId });
          setDownloadUrl(result.htmlUrl || null);
          break;
      }
      
      setExportStatus("success");
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("error");
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const handleShare = async () => {
    if (downloadUrl && navigator.share) {
      try {
        await navigator.share({
          title: `${title} - Insight Atlas`,
          url: downloadUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        console.log("Share cancelled or failed");
      }
    } else if (downloadUrl) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(downloadUrl);
      alert("Link copied to clipboard!");
    }
  };

  const resetAndClose = () => {
    setExportStatus("idle");
    setDownloadUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={resetAndClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Insights
          </h2>
          <button
            onClick={resetAndClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {exportStatus === "idle" && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose a format to export "{title}"
              </p>
              
              {/* Format options */}
              <div className="space-y-2">
                {formatOptions.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedFormat === format.id
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedFormat === format.id
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}>
                      {format.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format.name}
                        <span className="text-xs text-gray-400 ml-2">{format.extension}</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format.description}
                      </div>
                    </div>
                    {selectedFormat === format.id && (
                      <Check className="w-5 h-5 text-amber-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all active:scale-[0.98]"
              >
                Export as {formatOptions.find(f => f.id === selectedFormat)?.name}
              </button>
            </>
          )}

          {exportStatus === "exporting" && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Generating your export...</p>
            </div>
          )}

          {exportStatus === "success" && (
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Export Ready!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                Your {formatOptions.find(f => f.id === selectedFormat)?.name} file is ready to download
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleShare}
                    className="py-3 px-4 border-2 border-amber-500 text-amber-600 font-medium rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all active:scale-[0.98]"
                  >
                    Share
                  </button>
                )}
              </div>
            </div>
          )}

          {exportStatus === "error" && (
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Export Failed
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                Something went wrong. Please try again.
              </p>
              
              <button
                onClick={() => setExportStatus("idle")}
                className="py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
