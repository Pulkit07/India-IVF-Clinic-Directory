import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { firestore } from "./lib/firebase";

const resendApiKey = defineSecret("RESEND_API_KEY");
const notificationEmail = defineString("CORRECTIONS_NOTIFICATION_EMAIL", { default: "" });
const fromEmail = defineString("CORRECTIONS_FROM_EMAIL", { default: "" });

type CorrectionSubmission = {
  clinicSlug?: string;
  correctionType?: string;
  message?: string;
  sourceUrl?: string | null;
  contactEmail?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export const notifyCorrectionSubmission = onDocumentCreated(
  {
    document: "correction_submissions/{submissionId}",
    region: "asia-south1",
    secrets: [resendApiKey],
    retry: true,
  },
  async event => {
    const submission = event.data?.data() as CorrectionSubmission | undefined;
    if (!submission) {
      logger.warn("Correction notification skipped because the submission was missing", {
        submissionId: event.params.submissionId,
      });
      return;
    }

    const recipient = notificationEmail.value().trim();
    const sender = fromEmail.value().trim();
    const apiKey = resendApiKey.value().trim();
    if (!recipient || !sender || !apiKey) {
      logger.warn("Correction notification skipped because email configuration is incomplete", {
        submissionId: event.params.submissionId,
      });
      return;
    }

    let clinicName = submission.clinicSlug ?? "Unknown clinic";
    if (submission.clinicSlug) {
      const clinics = await firestore
        .collection("clinics")
        .where("slug", "==", submission.clinicSlug)
        .limit(1)
        .get();
      clinicName = String(clinics.docs[0]?.data().name ?? submission.clinicSlug);
    }

    const correctionType = label(submission.correctionType ?? "other");
    const source = submission.sourceUrl
      ? `<p><strong>Supporting source:</strong> <a href="${escapeHtml(submission.sourceUrl)}">${escapeHtml(submission.sourceUrl)}</a></p>`
      : "";
    const html = `
      <h2>New clinic correction</h2>
      <p><strong>Clinic:</strong> ${escapeHtml(clinicName)}</p>
      <p><strong>Category:</strong> ${escapeHtml(correctionType)}</p>
      <p><strong>Suggested change:</strong></p>
      <p>${escapeHtml(submission.message ?? "").replaceAll("\n", "<br>")}</p>
      ${source}
      <p><strong>Submitted by:</strong> ${escapeHtml(submission.contactEmail ?? "Not provided")}</p>
      <p><strong>Submission ID:</strong> ${escapeHtml(event.params.submissionId)}</p>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `correction-submission/${event.params.submissionId}`,
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `Clinic correction: ${clinicName}`,
        html,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      logger.error("Resend rejected the correction notification", {
        submissionId: event.params.submissionId,
        status: response.status,
        responseBody,
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Resend returned retryable HTTP ${response.status}`);
      }
      return;
    }

    logger.info("Correction notification sent", {
      submissionId: event.params.submissionId,
      clinicSlug: submission.clinicSlug,
    });
  },
);
