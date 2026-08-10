import nodemailer, { Transporter } from 'nodemailer';

/**
 * SMTP is entirely optional. A self-hosted instance that hasn't configured
 * it should keep working exactly as before -- invite links still get
 * created and shown for manual copy/send, they just don't also get
 * emailed. Callers check `mailerConfigured()` and treat a missing send as
 * non-fatal, never as a reason to fail invite creation.
 */
export const mailerConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter: Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;

  // Port 465 is implicit TLS; anything else (587, 25) starts unencrypted
  // and upgrades via STARTTLS, which nodemailer does automatically when
  // `secure` is false.
  const port = Number(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });

  return transporter;
};

export type InviteEmailInput = {
  to: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN';
  orgName: string | null;
  inviteUrl: string;
  expiresAt: Date;
};

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string
  );

const buildHtml = ({
  name,
  role,
  orgName,
  inviteUrl,
  expiresAt
}: InviteEmailInput) => {
  const roleLine =
    role === 'SUPERADMIN'
      ? 'a superadmin, able to see every workspace and manage users'
      : orgName
      ? `an admin of the "${escapeHtml(orgName)}" workspace`
      : 'an admin, with your own new workspace';

  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111633;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #8C7CF0;"></span>
        <strong style="font-size: 16px;">Middleware</strong>
      </div>
      <h2 style="font-size: 20px; margin: 0 0 12px;">You've been invited, ${escapeHtml(
        name
      )}</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #444;">
        You'll be ${roleLine}. Follow the link below to choose a password and
        finish setting up your account.
      </p>
      <p style="margin: 28px 0;">
        <a href="${inviteUrl}" style="background: #8C7CF0; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Accept invitation
        </a>
      </p>
      <p style="font-size: 12px; color: #888;">
        This link expires on ${expiresAt.toUTCString()} and can only be used
        once. If you weren't expecting this, you can ignore it.
      </p>
    </div>
  `;
};

const buildText = ({ name, inviteUrl, expiresAt }: InviteEmailInput) =>
  `Hi ${name},\n\n` +
  `You've been invited to Middleware. Set up your account here:\n${inviteUrl}\n\n` +
  `This link expires on ${expiresAt.toUTCString()} and can only be used once.\n`;

/**
 * Best-effort. Returns whether the send actually succeeded so callers can
 * surface that to the UI -- but a failure here is never a reason to undo
 * invite creation; the link itself is already valid and copyable
 * regardless of whether the email went out.
 */
export const sendInviteEmail = async (
  input: InviteEmailInput
): Promise<{ sent: boolean; error?: string }> => {
  if (!mailerConfigured()) return { sent: false, error: 'SMTP not configured' };

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: "You've been invited to Middleware",
      text: buildText(input),
      html: buildHtml(input)
    });
    return { sent: true };
  } catch (err) {
    // Logged, not thrown -- see module comment on why this stays non-fatal.
    console.error('[mailer] failed to send invite email', err);
    return { sent: false, error: (err as Error).message };
  }
};
