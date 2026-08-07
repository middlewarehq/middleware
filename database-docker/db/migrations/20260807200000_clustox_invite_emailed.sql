-- migrate:up
-- CLUSTOX: track whether an invite's email actually went out, separately
-- from the invite existing. SMTP is optional and best-effort (see
-- src/utils/mailer.ts) -- a superadmin can always fall back to copying the
-- link manually, but the "Pending invitations" list should be able to say
-- whether that fallback is actually necessary for a given invite.
ALTER TABLE "ClustoxInvite" ADD COLUMN emailed_at timestamptz;

-- migrate:down
ALTER TABLE "ClustoxInvite" DROP COLUMN emailed_at;
