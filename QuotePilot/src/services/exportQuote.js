import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Native: render the HTML to a PDF file and open the share sheet (email, text,
// WhatsApp, AirDrop, save to Files...). Falls back to the print dialog on
// devices with no share sheet.
export async function shareQuotePdf(html, filename) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
  } else {
    await Print.printAsync({ uri });
  }
}
