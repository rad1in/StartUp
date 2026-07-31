/**
 * Abstract email provider. A real transport (SMTP, …) extends this and is
 * registered in email/index.js — nothing outside this folder should depend
 * on a specific transport's API shape.
 */
class EmailProvider {
  // eslint-disable-next-line no-unused-vars
  async sendEmail({ to, subject, html, text, attachments }) {
    throw new Error('sendEmail must be implemented by the email provider');
  }
}

module.exports = EmailProvider;
