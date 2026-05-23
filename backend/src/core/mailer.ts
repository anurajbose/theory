import nodemailer from 'nodemailer';
import logger from '../utils/logger';

/**
 * SMTP when configured (SMTP_HOST...), otherwise a dev fallback that LOGS the
 * message (so flows like password-reset work locally without an SMTP server).
 * Production MUST set SMTP_* (or SES) — a startup-visible warning is emitted.
 */
const hasSmtp = !!process.env.SMTP_HOST;

const transport = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  : null;

if (!hasSmtp) logger.warn('SMTP not configured — emails are logged, not sent (dev only)');

const FROM = process.env.MAIL_FROM || 'THEORY <no-reply@theory.local>';

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!transport) {
    logger.info('mail_dev_fallback', { to: opts.to, subject: opts.subject, html: opts.html });
    return;
  }
  await transport.sendMail({ from: FROM, ...opts });
}
