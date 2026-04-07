import {
  getPublisherByKitSlug,
  getKitBySlug,
  wasNotifiedRecently,
  recordNotification,
  getInstallCount,
  getLearningsCount,
} from "@kithub/db";
import { createTransport } from "nodemailer";

const NOTIFICATION_TYPES = {
  INSTALL: "install",
  LEARNING: "learning",
} as const;

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const smtpUrl = process.env.SMTP_URL;
  const fromAddress = process.env.EMAIL_FROM || "noreply@kithub.dev";

  if (smtpUrl) {
    try {
      const transport = createTransport(smtpUrl);
      await transport.sendMail({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      console.log(`[notifications] Email sent to ${payload.to}: ${payload.subject}`);
      return true;
    } catch (err: any) {
      console.error(`[notifications] Email send failed: ${err.message}`);
      return false;
    }
  }

  console.log(`[notifications] (dev mode) Email to ${payload.to}:`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  Body: ${payload.text}`);
  return true;
}

const dashboardUrl = process.env.WEB_URL || "http://localhost:3000";

export async function notifyOnInstall(kitSlug: string): Promise<void> {
  try {
    const owner = await getPublisherByKitSlug(kitSlug);
    if (!owner) return;

    const alreadyNotified = await wasNotifiedRecently(
      owner.publisher.id,
      kitSlug,
      NOTIFICATION_TYPES.INSTALL
    );
    if (alreadyNotified) return;

    const kit = await getKitBySlug(kitSlug);
    const kitTitle = kit?.title || kitSlug;
    const installs = await getInstallCount(kitSlug);

    const sent = await sendEmail({
      to: owner.user.email,
      subject: `Your kit "${kitTitle}" was installed!`,
      text: [
        `Great news! Your kit "${kitTitle}" (${kitSlug}) was just installed.`,
        ``,
        `Total installs: ${installs}`,
        ``,
        `View your dashboard: ${dashboardUrl}/dashboard`,
      ].join("\n"),
      html: [
        `<h2>Your kit was installed!</h2>`,
        `<p>Great news! Your kit <strong>${kitTitle}</strong> (<code>${kitSlug}</code>) was just installed.</p>`,
        `<p>Total installs: <strong>${installs}</strong></p>`,
        `<p><a href="${dashboardUrl}/dashboard">View your dashboard</a></p>`,
      ].join("\n"),
    });

    if (sent) {
      await recordNotification(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.INSTALL);
    } else {
      console.error(`[notifications] Email delivery failed for install of ${kitSlug}, will retry on next event`);
    }
  } catch (err: any) {
    console.error(`[notifications] Install notification error for ${kitSlug}: ${err.message}`);
  }
}

export async function notifyOnLearning(kitSlug: string): Promise<void> {
  try {
    const owner = await getPublisherByKitSlug(kitSlug);
    if (!owner) return;

    const alreadyNotified = await wasNotifiedRecently(
      owner.publisher.id,
      kitSlug,
      NOTIFICATION_TYPES.LEARNING
    );
    if (alreadyNotified) return;

    const kit = await getKitBySlug(kitSlug);
    const kitTitle = kit?.title || kitSlug;
    const learnings = await getLearningsCount(kitSlug);

    const sent = await sendEmail({
      to: owner.user.email,
      subject: `New community learning for "${kitTitle}"`,
      text: [
        `Someone submitted a learning for your kit "${kitTitle}" (${kitSlug}).`,
        ``,
        `Total learnings: ${learnings}`,
        ``,
        `View your dashboard: ${dashboardUrl}/dashboard`,
      ].join("\n"),
      html: [
        `<h2>New community learning!</h2>`,
        `<p>Someone submitted a learning for your kit <strong>${kitTitle}</strong> (<code>${kitSlug}</code>).</p>`,
        `<p>Total learnings: <strong>${learnings}</strong></p>`,
        `<p><a href="${dashboardUrl}/dashboard">View your dashboard</a></p>`,
      ].join("\n"),
    });

    if (sent) {
      await recordNotification(owner.publisher.id, kitSlug, NOTIFICATION_TYPES.LEARNING);
    } else {
      console.error(`[notifications] Email delivery failed for learning on ${kitSlug}, will retry on next event`);
    }
  } catch (err: any) {
    console.error(`[notifications] Learning notification error for ${kitSlug}: ${err.message}`);
  }
}
