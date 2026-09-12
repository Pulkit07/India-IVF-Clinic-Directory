import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button, Eyebrow, PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";
import { useSubmitCorrection } from "@/lib/directory-hooks";

export default function Corrections() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const [form, setForm] = useState({
    clinicSlug: params.get("clinic") || "",
    observationId: "",
    message: "",
    contactEmail: "",
  });
  const [done, setDone] = useState(false);
  const submitCorrection = useSubmitCorrection();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    submitCorrection.mutate(
      { data: { ...form, observationId: form.observationId || null } },
      { onSuccess: () => setDone(true) },
    );
  };
  return (
    <Shell>
      <PageIntro
        eyebrow="Keep the record useful"
        title="Notice something that needs correcting?"
        description="Tell us what looks out of date or inaccurate. Specific, sourced notes help us review changes carefully."
      />
      <div className="shell-inner form-layout">
        {done ? (
          <div className="success-panel">
            <div className="success-icon">
              <Check size={22} />
            </div>
            <Eyebrow>Correction received</Eyebrow>
            <h2>Thank you for helping keep the record clear.</h2>
            <p>
              Your note has been logged for review. We will use the contact
              details only if we need to clarify the report.
            </p>
            <Link
              href="/clinics"
              className="btn btn-primary"
              data-testid="link-correction-directory"
            >
              Return to directory <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <form className="public-form" onSubmit={submit}>
            <label className="field-label">
              Clinic slug
              <input
                required
                value={form.clinicSlug}
                onChange={(e) =>
                  setForm({ ...form, clinicSlug: e.target.value })
                }
                placeholder="For example, lotus-fertility-delhi"
                data-testid="input-correction-clinic"
              />
            </label>
            <label className="field-label">
              Observation ID <span className="optional">optional</span>
              <input
                value={form.observationId}
                onChange={(e) =>
                  setForm({ ...form, observationId: e.target.value })
                }
                placeholder="If your note concerns a specific rate"
                data-testid="input-correction-observation"
              />
            </label>
            <label className="field-label">
              What should we review?
              <textarea
                required
                minLength={10}
                maxLength={5000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the issue and include a source link if you have one."
                data-testid="textarea-correction-message"
              />
            </label>
            <label className="field-label">
              Your email
              <input
                required
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                placeholder="you@example.com"
                data-testid="input-correction-email"
              />
            </label>
            <Button
              type="submit"
              className="submit-button"
              disabled={submitCorrection.isPending}
              data-testid="button-submit-correction"
            >
              {submitCorrection.isPending ? "Sending…" : "Send correction"}{" "}
              <ArrowRight size={17} />
            </Button>
            {submitCorrection.isError && (
              <p className="form-error">
                We could not send that just now. Please try again.
              </p>
            )}
            <p className="form-footnote">
              Please do not include medical records or sensitive personal health
              information.
            </p>
          </form>
        )}
        <aside className="form-aside">
          <div className="aside-note">
            <ClipboardCheck size={18} />
            <p>
              <strong>What helps most</strong> The clinic name, the field that
              needs review, a clear explanation, and a public source or date.
            </p>
          </div>
          <Link
            href="/glossary"
            className="text-link"
            data-testid="link-correction-methodology"
          >
            Understand success rates <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </Shell>
  );
}
