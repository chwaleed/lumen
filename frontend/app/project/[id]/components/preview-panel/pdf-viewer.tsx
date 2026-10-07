type PdfViewerProps = {
  src: string;
  title: string;
};

/**
 * The browser's own PDF viewer, via an iframe.
 *
 * ponytail: no pdf.js or react-pdf dependency. Chrome and Firefox both ship a
 * viewer with page navigation, zoom, search and print, and the proxy route is
 * same-origin so the session cookie is sent with the request. Reach for pdf.js
 * when we need things the built-in viewer cannot do -- SyncTeX click-to-source,
 * or drawing error markers over the page -- which is M5 and later.
 */
export function PdfViewer({ src, title }: PdfViewerProps) {
  return (
    <iframe
      key={src}
      src={src}
      title={title}
      className="h-full w-full border-0 bg-muted"
    />
  );
}
