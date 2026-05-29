import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'ernstisrael2000@gmail.com';
const ADMIN_EMAIL = 'ernstisrael2000@gmail.com';

let resend: Resend | null = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn('[Email] RESEND_API_KEY non défini — emails désactivés');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return `$${Number(amount).toFixed(2)}`;
}

function dateFr(d?: Date) {
  return (d || new Date()).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function baseHtml(title: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">RENA INTELLIGENCE</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
              Cet email a été envoyé automatiquement par le système Rena Intelligence.<br/>
              Ne répondez pas à cet email. Pour toute question, contactez le support.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;">
      <span style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;text-align:right;">
      <span style="font-size:14px;font-weight:${highlight ? '800' : '600'};color:${highlight ? '#1a1a2e' : '#444'};">${value}</span>
    </td>
  </tr>`;
}

function statusBadge(status: string): string {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: '#fff3cd', color: '#856404', label: 'En attente' },
    approved:  { bg: '#d1fae5', color: '#065f46', label: 'Approuvé' },
    rejected:  { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' },
    confirmed: { bg: '#d1fae5', color: '#065f46', label: 'Confirmé' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151', label: status };
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${s.bg};color:${s.color};font-size:12px;font-weight:700;">${s.label}</span>`;
}

// ── Send wrapper ──────────────────────────────────────────────────────────────

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (e: any) {
    console.error('[Email] Erreur envoi:', e?.message || e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Dépôt soumis → admin + client
export async function emailDepositSubmitted(opts: {
  clientName: string; clientEmail?: string; amount: number;
  method: string; txId?: string; walletId?: string;
}): Promise<void> {
  const { clientName, clientEmail, amount, method, txId, walletId } = opts;
  const date = dateFr();

  const adminHtml = baseHtml('💰 Nouveau dépôt', '#059669',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Une nouvelle demande de dépôt a été soumise.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Client', clientName, true)}
      ${walletId ? row('Wallet ID', walletId) : ''}
      ${row('Montant', fmt(amount), true)}
      ${row('Méthode', method)}
      ${txId ? row('Référence', txId) : ''}
      ${row('Date', date)}
      ${row('Statut', statusBadge('pending'))}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#065f46;border-left:4px solid #059669;">
      ⚡ Connectez-vous au tableau de bord pour approuver ou refuser ce dépôt.
    </p>`
  );
  await send(ADMIN_EMAIL, `💰 Dépôt ${fmt(amount)} — ${clientName}`, adminHtml);

  if (clientEmail) {
    const clientHtml = baseHtml('Dépôt en cours de traitement', '#059669',
      `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${clientName}</strong>, votre demande de dépôt a bien été reçue et est en cours de validation.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Montant', fmt(amount), true)}
        ${row('Méthode', method)}
        ${row('Date', date)}
        ${row('Statut', statusBadge('pending'))}
      </table>
      <p style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#065f46;">
        Vous serez notifié dès que votre dépôt sera traité.
      </p>`
    );
    await send(clientEmail, `💰 Votre dépôt de ${fmt(amount)} est en cours`, clientHtml);
  }
}

// 2. Dépôt approuvé → client
export async function emailDepositApproved(opts: {
  clientName: string; clientEmail?: string; amount: number;
}): Promise<void> {
  if (!opts.clientEmail) return;
  const html = baseHtml('✅ Dépôt approuvé', '#059669',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${opts.clientName}</strong>, votre dépôt a été approuvé et crédité sur votre compte.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Montant crédité', fmt(opts.amount), true)}
      ${row('Date', dateFr())}
      ${row('Statut', statusBadge('approved'))}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#065f46;">
      🎉 Votre solde a été mis à jour. Vous pouvez l'utiliser dès maintenant.
    </p>`
  );
  await send(opts.clientEmail, `✅ Dépôt de ${fmt(opts.amount)} approuvé`, html);
}

// 3. Dépôt refusé → client
export async function emailDepositRejected(opts: {
  clientName: string; clientEmail?: string; amount: number; reason?: string;
}): Promise<void> {
  if (!opts.clientEmail) return;
  const html = baseHtml('❌ Dépôt refusé', '#dc2626',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${opts.clientName}</strong>, votre demande de dépôt n'a pas pu être validée.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Montant', fmt(opts.amount), true)}
      ${row('Date', dateFr())}
      ${row('Statut', statusBadge('rejected'))}
      ${opts.reason ? row('Raison', opts.reason) : ''}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#fef2f2;border-radius:10px;font-size:13px;color:#991b1b;border-left:4px solid #dc2626;">
      Contactez le support si vous avez des questions.
    </p>`
  );
  await send(opts.clientEmail, `❌ Dépôt de ${fmt(opts.amount)} refusé`, html);
}

// 4. Retrait soumis → admin + client
export async function emailWithdrawalSubmitted(opts: {
  clientName: string; clientEmail?: string; amount: number;
  method: string; accountNumber: string; accountName?: string;
}): Promise<void> {
  const { clientName, clientEmail, amount, method, accountNumber, accountName } = opts;
  const date = dateFr();

  const adminHtml = baseHtml('🏧 Nouveau retrait', '#7c3aed',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Une nouvelle demande de retrait a été soumise.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Client', clientName, true)}
      ${row('Montant', fmt(amount), true)}
      ${row('Méthode', method)}
      ${row('Compte', accountNumber)}
      ${accountName ? row('Bénéficiaire', accountName) : ''}
      ${row('Date', date)}
      ${row('Statut', statusBadge('pending'))}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#faf5ff;border-radius:10px;font-size:13px;color:#6d28d9;border-left:4px solid #7c3aed;">
      ⚠️ Le solde client a été débité. Traitez ce retrait depuis le tableau de bord.
    </p>`
  );
  await send(ADMIN_EMAIL, `🏧 Retrait ${fmt(amount)} — ${clientName}`, adminHtml);

  if (clientEmail) {
    const clientHtml = baseHtml('Retrait en cours de traitement', '#7c3aed',
      `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${clientName}</strong>, votre demande de retrait a bien été reçue.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Montant', fmt(amount), true)}
        ${row('Méthode', method)}
        ${row('Compte', accountNumber)}
        ${row('Date', date)}
        ${row('Statut', statusBadge('pending'))}
      </table>
      <p style="margin:24px 0 0;padding:16px;background:#faf5ff;border-radius:10px;font-size:13px;color:#6d28d9;">
        Vous serez notifié dès que votre retrait sera traité.
      </p>`
    );
    await send(clientEmail, `🏧 Votre retrait de ${fmt(amount)} est en cours`, clientHtml);
  }
}

// 5. Retrait approuvé → client
export async function emailWithdrawalApproved(opts: {
  clientName: string; clientEmail?: string; amount: number;
}): Promise<void> {
  if (!opts.clientEmail) return;
  const html = baseHtml('✅ Retrait approuvé', '#7c3aed',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${opts.clientName}</strong>, votre retrait a été approuvé et est en cours de traitement.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Montant', fmt(opts.amount), true)}
      ${row('Date', dateFr())}
      ${row('Statut', statusBadge('approved'))}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#faf5ff;border-radius:10px;font-size:13px;color:#6d28d9;">
      Votre argent sera disponible selon le délai de traitement habituel.
    </p>`
  );
  await send(opts.clientEmail, `✅ Retrait de ${fmt(opts.amount)} approuvé`, html);
}

// 6. Retrait refusé → client
export async function emailWithdrawalRejected(opts: {
  clientName: string; clientEmail?: string; amount: number; reason?: string;
}): Promise<void> {
  if (!opts.clientEmail) return;
  const html = baseHtml('❌ Retrait refusé', '#dc2626',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${opts.clientName}</strong>, votre demande de retrait a été refusée. Le montant a été remis sur votre solde.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Montant remboursé', fmt(opts.amount), true)}
      ${row('Date', dateFr())}
      ${row('Statut', statusBadge('rejected'))}
      ${opts.reason ? row('Raison', opts.reason) : ''}
    </table>`
  );
  await send(opts.clientEmail, `❌ Retrait de ${fmt(opts.amount)} refusé`, html);
}

// 7. OTP retrait agent → client (sécurité)
export async function emailWithdrawalOtp(opts: {
  clientName: string; clientEmail: string; agentName: string;
  amount: number; otpCode: string; expiresMinutes: number;
}): Promise<void> {
  const { clientName, clientEmail, agentName, amount, otpCode, expiresMinutes } = opts;
  const html = baseHtml('🔐 Code de confirmation retrait', '#dc2626',
    `<p style="margin:0 0 16px;font-size:15px;color:#444;">Bonjour <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#444;">
      L'agent <strong>${agentName}</strong> souhaite effectuer un retrait de <strong>${fmt(amount)}</strong> depuis votre compte.
      Pour autoriser cette opération, saisissez le code ci-dessous dans l'application.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:#1a1a2e;color:#ffffff;font-size:36px;font-weight:900;letter-spacing:12px;padding:20px 36px;border-radius:16px;font-family:'Courier New',monospace;">
        ${otpCode}
      </div>
      <p style="margin:12px 0 0;font-size:12px;color:#888;">Ce code expire dans <strong>${expiresMinutes} minutes</strong></p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Agent', agentName)}
      ${row('Montant', fmt(amount), true)}
      ${row('Date', dateFr())}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#fef2f2;border-radius:10px;font-size:13px;color:#991b1b;border-left:4px solid #dc2626;">
      ⚠️ <strong>Ne partagez jamais ce code.</strong> Si vous n'avez pas demandé ce retrait, refusez immédiatement depuis l'application.
    </p>`
  );
  await send(clientEmail, `🔐 Code de confirmation — Retrait de ${fmt(amount)}`, html);
}

// 8. Commission affilié générée
export async function emailAffiliateCommission(opts: {
  affiliateName: string; affiliateEmail?: string;
  amount: number; sourceClientName?: string; type?: string;
}): Promise<void> {
  if (!opts.affiliateEmail) return;
  const { affiliateName, affiliateEmail, amount, sourceClientName, type } = opts;
  const html = baseHtml('💎 Commission reçue', '#2563eb',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${affiliateName}</strong>, une nouvelle commission a été créditée sur votre compte !</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Commission', fmt(amount), true)}
      ${sourceClientName ? row('Source', sourceClientName) : ''}
      ${type ? row('Type', type) : ''}
      ${row('Date', dateFr())}
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#eff6ff;border-radius:10px;font-size:13px;color:#1e40af;border-left:4px solid #2563eb;">
      🎉 Votre solde a été mis à jour. Consultez votre tableau de bord pour les détails.
    </p>`
  );
  await send(affiliateEmail, `💎 Commission de ${fmt(amount)} créditée`, html);
}

// 9. Retrait agent confirmé par client → admin notification
export async function emailAgentWithdrawalConfirmed(opts: {
  clientName: string; clientEmail?: string; agentName: string; amount: number;
}): Promise<void> {
  const { clientName, clientEmail, agentName, amount } = opts;

  const adminHtml = baseHtml('✅ Retrait agent confirmé', '#059669',
    `<p style="margin:0 0 20px;font-size:15px;color:#444;">Un retrait initié par un agent a été confirmé par le client.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Client', clientName, true)}
      ${row('Agent', agentName)}
      ${row('Montant', fmt(amount), true)}
      ${row('Date', dateFr())}
      ${row('Statut', statusBadge('confirmed'))}
    </table>`
  );
  await send(ADMIN_EMAIL, `✅ Retrait agent ${fmt(amount)} confirmé — ${clientName}`, adminHtml);

  if (clientEmail) {
    const clientHtml = baseHtml('✅ Retrait confirmé', '#059669',
      `<p style="margin:0 0 20px;font-size:15px;color:#444;">Bonjour <strong>${clientName}</strong>, vous avez confirmé le retrait initié par l'agent <strong>${agentName}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Montant débité', fmt(amount), true)}
        ${row('Agent', agentName)}
        ${row('Date', dateFr())}
        ${row('Statut', statusBadge('confirmed'))}
      </table>`
    );
    await send(clientEmail, `✅ Retrait de ${fmt(amount)} confirmé`, clientHtml);
  }
}

// 10. Log email envoyé (retourné pour stockage Firestore)
export interface EmailLogEntry {
  type: string;
  to: string | string[];
  subject: string;
  sentAt: Date;
  success: boolean;
}
