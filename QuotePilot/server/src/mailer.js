// Sends transactional email through Resend when RESEND_API_KEY is set.
// Without it (local development) the message is printed to the server log.
export function createMailer(config) {
  return {
    async send({ to, subject, text }) {
      if (!config.resendApiKey) {
        console.log(`[mail] to=${to} subject="${subject}"\n${text}\n`);
        return;
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.mailFrom, to: [to], subject, text }),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}: ${await response.text()}`);
    },
  };
}
