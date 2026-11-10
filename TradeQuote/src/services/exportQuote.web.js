// Web: print the quote document itself (not the app page) from a hidden
// iframe; the browser's print dialog offers "Save as PDF".
export async function shareQuotePdf(html, filename) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await new Promise((resolve) => {
    frame.onload = resolve;
  });
  frame.contentDocument.title = filename;
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 60000);
}
