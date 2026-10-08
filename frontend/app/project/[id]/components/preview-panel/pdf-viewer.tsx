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
/**
 * Hide the thumbnail sidebar and fit the page to the pane's width.
 *
 * The preview pane is a third of the window, and the sidebar ate most of it --
 * leaving the page itself too small to read. `navpanes=0` collapses it;
 * `view=FitH` then uses the width that frees up. The toolbar stays: it carries
 * zoom, search, page navigation and print.
 */
const VIEWER_PARAMS = "#toolbar=1&navpanes=0&view=FitH";

export function PdfViewer({ src, title }: PdfViewerProps) {
  return (
    <iframe
      key={src}
      src={`${src}${VIEWER_PARAMS}`}
      title={title}
      className="h-full w-full border-0 bg-muted"
    />
  );
}
