import { Platform, Share } from 'react-native';
import { notify } from './dialogs';

// Hands a plain-text message to the share sheet (text, email, WhatsApp...).
// Browsers without a share sheet get it on the clipboard instead.
export async function shareText(message) {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ text: message });
    } catch (error) {
      // Dismissing the sheet rejects; nothing to report.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(message);
    notify('Message copied', 'Paste it into a text or email to your customer.');
  } catch (error) {
    notify('Follow-up message', message);
  }
}
