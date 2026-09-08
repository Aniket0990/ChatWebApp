import { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiDownload,
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
  FiMaximize2,
  FiMinimize2,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
} from "react-icons/fi";
import { IoVolumeMedium } from "react-icons/io5";

// Document preview modal adapted from KARYAH-v3's Documentpreviewmodal.
// Detects file type from mime/extension and renders a fitting viewer:
// image (zoom/rotate), pdf (iframe), video, audio, and a fallback
// "not previewable" card with a download button.

const FileType = {
  IMAGE: "image",
  PDF: "pdf",
  VIDEO: "video",
  AUDIO: "audio",
  DOC: "doc",
  EXCEL: "excel",
  TXT: "txt",
  UNKNOWN: "unknown",
};

const detectFileType = (url, mimeType) => {
  if (mimeType) {
    if (/^image\//.test(mimeType)) return FileType.IMAGE;
    if (mimeType === "application/pdf") return FileType.PDF;
    if (/^video\//.test(mimeType)) return FileType.VIDEO;
    if (/^audio\//.test(mimeType)) return FileType.AUDIO;
    if (/^text\/plain/.test(mimeType)) return FileType.TXT;
    if (/wordprocessingml|msword|presentation|powerpoint/i.test(mimeType))
      return FileType.DOC;
    if (/spreadsheetml|ms-excel/i.test(mimeType)) return FileType.EXCEL;
  }
  const lower = (url || "").toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower))
    return FileType.IMAGE;
  if (/\.pdf(\?|$)/.test(lower)) return FileType.PDF;
  if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/.test(lower)) return FileType.VIDEO;
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|mpeg|amr|mpe)(\?|$)/.test(lower))
    return FileType.AUDIO;
  if (/\.(doc|docx|ppt|pptx)(\?|$)/.test(lower)) return FileType.DOC;
  if (/\.(xls|xlsx|csv)(\?|$)/.test(lower)) return FileType.EXCEL;
  if (/\.txt(\?|$)/.test(lower)) return FileType.TXT;
  return FileType.UNKNOWN;
};

const getCleanFileName = (url) => {
  const raw = url.split("/").pop() || "file";
  const decoded = decodeURIComponent(raw).split("?")[0];
  return decoded.replace(/^\d{10,}[-_]/, "");
};

const getFileTypeLabel = (type) => {
  const labels = {
    [FileType.IMAGE]: "Image",
    [FileType.PDF]: "PDF Document",
    [FileType.VIDEO]: "Video",
    [FileType.AUDIO]: "Audio",
    [FileType.DOC]: "Document",
    [FileType.EXCEL]: "Excel Spreadsheet",
    [FileType.TXT]: "Text File",
    [FileType.UNKNOWN]: "File",
  };
  return labels[type];
};

const getAccentColor = (type) => {
  const colors = {
    [FileType.IMAGE]: "#3B82F6",
    [FileType.PDF]: "#EF4444",
    [FileType.VIDEO]: "#8B5CF6",
    [FileType.AUDIO]: "#EC4899",
    [FileType.DOC]: "#1070b9",
    [FileType.EXCEL]: "#059669",
    [FileType.TXT]: "#6B7280",
    [FileType.UNKNOWN]: "#6B7280",
  };
  return colors[type];
};

export default function DocumentPreviewModal({
  url,
  onClose,
  darkMode = false,
  getFileUrl, // optional async (url) => usableUrl — used to bypass CDN restrictions
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [activeUrl, setActiveUrl] = useState(url);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const backdropRef = useRef(null);

  useEffect(() => {
    setActiveUrl(url);
    setZoom(1);
    setRotation(0);
    setLoadError(false);
    setResolvedUrl(null);
  }, [url]);

  // Resolve the raw stored url into something the browser can actually open
  // (e.g. a blob fetched through the server proxy). Direct cloudinary PDF
  // links 401 in the browser, so without this the iframe shows an error page.
  useEffect(() => {
    let cancelled = false;
    if (!activeUrl) return;
    if (getFileUrl) {
      getFileUrl(activeUrl)
        .then((u) => {
          if (!cancelled) setResolvedUrl(u || activeUrl);
        })
        .catch(() => {
          if (!cancelled) {
            setResolvedUrl(activeUrl);
            setLoadError(true);
          }
        });
    } else {
      setResolvedUrl(activeUrl);
    }
    return () => {
      cancelled = true;
    };
  }, [activeUrl, getFileUrl]);

  const fileType = detectFileType(activeUrl || "", null);
  const fileName = getCleanFileName(activeUrl || "");

  const handleDownloadClick = async () => {
    if (!activeUrl) return;
    setIsDownloading(true);
    try {
      let href = activeUrl;
      if (getFileUrl) {
        href = (await getFileUrl(activeUrl)) || activeUrl;
      }
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  const isOpen = Boolean(activeUrl);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !activeUrl) return null;

  const accentColor = getAccentColor(fileType);
  const typeLabel = getFileTypeLabel(fileType);

  const renderViewer = () => {
    // Proxy fetch failed AND direct url is blocked (e.g. cloudinary 401):
    // show a friendly error card instead of the browser's error page.
    if (loadError) {
      return (
        <div
          className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[300px] ${
            darkMode ? "bg-[#111b21]" : "bg-gray-50"
          }`}
        >
          <FiFileText size={36} className="text-gray-400" />
          <div>
            <p
              className={`text-xs font-semibold ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              {fileName}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Unable to load preview. Try downloading the file instead.
            </p>
          </div>
          <button
            onClick={handleDownloadClick}
            className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-medium flex items-center gap-1 mt-2 transition-colors cursor-pointer"
          >
            <FiDownload size={12} /> Download file
          </button>
        </div>
      );
    }

    // Waiting for the proxy to resolve the url
    if (!resolvedUrl) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      );
    }

    switch (fileType) {
      case FileType.IMAGE:
        return (
          <div className="flex flex-col h-full">
            <div
              className={`flex items-center gap-1.5 px-3 py-2 border-b shrink-0 ${
                darkMode
                  ? "border-[#222e35] bg-[#111b21]"
                  : "border-gray-100 bg-gray-50/80"
              }`}
            >
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                  darkMode
                    ? "hover:bg-[#202c33] text-gray-300"
                    : "hover:bg-gray-200 text-gray-600"
                }`}
                disabled={zoom <= 0.25}
                title="Zoom out"
              >
                <FiZoomOut size={14} />
              </button>
              <span
                className={`text-xs font-mono w-12 text-center select-none ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                  darkMode
                    ? "hover:bg-[#202c33] text-gray-300"
                    : "hover:bg-gray-200 text-gray-600"
                }`}
                disabled={zoom >= 4}
                title="Zoom in"
              >
                <FiZoomIn size={14} />
              </button>
              <div
                className={`w-px h-4 mx-1 ${darkMode ? "bg-[#2a3942]" : "bg-gray-200"}`}
              />
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className={`p-1.5 rounded-md transition-colors ${
                  darkMode
                    ? "hover:bg-[#202c33] text-gray-300"
                    : "hover:bg-gray-200 text-gray-600"
                }`}
                title="Rotate 90°"
              >
                <FiRotateCw size={14} />
              </button>
            </div>
            <div
              className={`flex-1 overflow-auto relative flex items-center justify-center p-4 ${
                darkMode ? "bg-[#0b141a]" : "bg-[#fcfcfc]"
              }`}
            >
              <img
                src={resolvedUrl}
                alt="Preview"
                draggable={false}
                onError={() => setLoadError(true)}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.1s ease",
                  maxHeight: "60vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
            </div>
          </div>
        );
      case FileType.PDF:
        return (
          <div className="flex flex-col h-full w-full">
            <iframe
              src={resolvedUrl}
              title="PDF Preview"
              className="flex-1 w-full h-full border-0"
            />
          </div>
        );
      case FileType.VIDEO:
        return (
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <video src={resolvedUrl} controls className="max-h-[60vh] max-w-full" />
          </div>
        );
      case FileType.AUDIO:
        return (
          <div
            className={`flex-1 flex flex-col items-center justify-center gap-4 p-6 min-h-[300px] ${
              darkMode ? "bg-[#111b21]" : "bg-gradient-to-br from-pink-50 to-purple-50"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-md">
              <IoVolumeMedium size={24} className="text-white" />
            </div>
            <div className="text-center">
              <p
                className={`text-xs font-semibold truncate max-w-[200px] ${
                  darkMode ? "text-gray-200" : "text-gray-800"
                }`}
              >
                {fileName}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Audio File</p>
            </div>
            <audio
              src={resolvedUrl}
              controls
              className="w-full max-w-xs shadow-xs rounded-lg mt-2"
            />
          </div>
        );
      default:
        return (
          <div
            className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[300px] ${
              darkMode ? "bg-[#111b21]" : "bg-gray-50"
            }`}
          >
            <FiFileText size={36} className="text-gray-400" />
            <div>
              <p
                className={`text-xs font-semibold ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                {fileName}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                This file type is not previewable in browser.
              </p>
            </div>
            <button
              onClick={handleDownloadClick}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-medium flex items-center gap-1 mt-2 transition-colors cursor-pointer"
            >
              <FiDownload size={12} /> Download file
            </button>
          </div>
        );
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[220] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
    >
      <div
        className={`shadow-2xl flex flex-col overflow-hidden transition-all duration-200 w-full relative z-10 ${
          fullscreen
            ? "inset-0 rounded-none h-screen max-h-screen fixed"
            : "max-w-4xl rounded-xl h-[80vh] max-h-[85vh]"
        } ${darkMode ? "bg-[#111b21]" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
          style={{ borderColor: `${accentColor}22` }}
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {fileType.toUpperCase().slice(0, 3)}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-semibold truncate leading-tight ${
                darkMode ? "text-gray-100" : "text-gray-800"
              }`}
              title={fileName}
            >
              {fileName}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">{typeLabel}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              title={isDownloading ? "Downloading..." : "Download"}
              disabled={isDownloading}
              onClick={handleDownloadClick}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                darkMode
                  ? "bg-[#202c33] hover:bg-[#2a3942] text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-500"
              }`}
            >
              {isDownloading ? (
                <div className="w-3.5 h-3.5 border border-gray-400 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <FiDownload size={13} />
              )}
            </button>
            <button
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={() => setFullscreen((f) => !f)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                darkMode
                  ? "bg-[#202c33] hover:bg-[#2a3942] text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-500"
              }`}
            >
              {fullscreen ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
            </button>
            <button
              title="Close"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors cursor-pointer"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>

        {/* Content Viewer area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="h-1 w-full shrink-0" style={{ background: accentColor }} />
          <div className="flex-1 relative flex flex-col min-h-0">{renderViewer()}</div>
        </div>
      </div>
    </div>
  );
}
