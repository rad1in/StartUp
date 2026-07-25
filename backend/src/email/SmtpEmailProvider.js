const nodemailer = require('nodemailer');
const EmailProvider = require('./EmailProvider');

class SmtpEmailProvider extends EmailProvider {
  constructor({ host, port, secure, user, pass, fromAddress, fromName } = {}) {
    super();
    this.fromAddress = fromAddress;
    this.fromName = fromName || 'ET-Cafe';
    this.host = host;
    this.port = port;
    this.secure = secure;
    this.user = user;
    this.pass = pass;
  }

  requireConfig() {
    if (!this.host || !this.user || !this.pass || !this.fromAddress) {
      const err = new Error('تنظیمات SMTP ایمیل کامل نیست.');
      err.status = 503;
      throw err;
    }
  }

  getTransport() {
    if (!this._transport) {
      this._transport = nodemailer.createTransport({
        host: this.host,
        port: Number(this.port) || 587,
        secure: Boolean(this.secure),
        auth: { user: this.user, pass: this.pass },
      });
    }
    return this._transport;
  }

  async sendEmail({ to, subject, html, text, attachments }) {
    this.requireConfig();
    await this.getTransport().sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to,
      subject,
      html,
      text: text || undefined,
      attachments: attachments || undefined,
    });
    return { sent: true };
  }
}

module.exports = SmtpEmailProvider;
