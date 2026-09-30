import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardCheck } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button, Eyebrow, PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";
import {
  getListClinicsQueryKey,
  useListClinics,
  useSubmitCorrection,
} from "@/lib/directory-hooks";

const correctionTypes = [
  ["address", "Address"],
  ["phone", "Phone number"],
  ["name", "Clinic name"],
  ["location", "Location"],
  ["success_rate", "Success-rate information"],
  ["closed", "Clinic has closed"],
  ["duplicate", "Duplicate listing"],
  ["other", "Something else"],
] as const;
type CorrectionType = (typeof correctionTypes)[number][0];

export default function Corrections() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialClinicSlug = params.get("clinic") || "";
  const [form, setForm] = useState<{
    clinicSlug: string;
    correctionType: CorrectionType | "";
    message: string;
    sourceUrl: string;
    contactEmail: string;
  }>({
    clinicSlug: initialClinicSlug,
    correctionType: "",
    message: "",
    sourceUrl: "",
    contactEmail: "",
  });
  const [clinicSelection, setClinicSelection] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [done, setDone] = useState(false);
  const clinics = useListClinics(undefined, {
    query: { queryKey: getListClinicsQueryKey() },
  });
  const submitCorrection = useSubmitCorrection();
  const clinicOptions = useMemo(
    () =>
      (clinics.data?.items || []).map((clinic) => ({
        label: `${clinic.name} — ${clinic.city}`,
        slug: clinic.slug,
      })),
    [clinics.data?.items],
  );

  useEffect(() => {
    if (!initialClinicSlug || clinicSelection || !clinicOptions.length) return;
    const selected = clinicOptions.find(
      (clinic) => clinic.slug === initialClinicSlug,
    );
    if (selected) setClinicSelection(selected.label);
  }, [clinicOptions, clinicSelection, initialClinicSlug]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const selected = clinicOptions.find(
      (clinic) => clinic.label === clinicSelection,
    );
    if (!selected) {
      setSelectionError("Choose a clinic from the suggestions.");
      return;
    }
    if (!form.correctionType) return;
    submitCorrection.mutate(
      {
        data: {
          ...form,
          clinicSlug: selected.slug,
          correctionType: form.correctionType,
          sourceUrl: form.sourceUrl || null,
        },
      },
      { onSuccess: () => setDone(true) },
    );
  };
  return (
    <Shell>
      <PageIntro
        eyebrow="Keep the record useful"
        title="Suggest an update"
        description="Found information that is missing or out of date? Tell us what needs changing and we’ll review it."
      />
      <div className="shell-inner form-layout">
        {done ? (
          <div className="success-panel">
            <div className="success-icon">
              <Check size={22} />
            </div>
            <Eyebrow>Suggestion received</Eyebrow>
            <h2>Thank you for helping improve the directory.</h2>
            <p>
              We’ve received your suggestion and will review it before updating
              the directory.
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
              Which clinic needs an update?
              <input
                required
                list="correction-clinics"
                value={clinicSelection}
                onChange={(event) => {
                  const value = event.target.value;
                  const selected = clinicOptions.find(
                    (clinic) => clinic.label === value,
                  );
                  setClinicSelection(value);
                  setForm({ ...form, clinicSlug: selected?.slug || "" });
                  setSelectionError("");
                }}
                placeholder={
                  clinics.isLoading ? "Loading clinics…" : "Search by clinic name"
                }
                aria-describedby="clinic-help"
                data-testid="input-correction-clinic"
              />
              <datalist id="correction-clinics">
                {clinicOptions.map((clinic) => (
                  <option value={clinic.label} key={clinic.slug} />
                ))}
              </datalist>
              <span className="field-help" id="clinic-help">
                Start typing, then choose the clinic and area from the list.
              </span>
              {selectionError && (
                <span className="field-error" role="alert">
                  {selectionError}
                </span>
              )}
            </label>
            <label className="field-label">
              What needs updating?
              <select
                required
                value={form.correctionType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    correctionType: event.target.value as CorrectionType | "",
                  })
                }
                data-testid="select-correction-type"
              >
                <option value="">Choose an option</option>
                {correctionTypes.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              What should we change?
              <textarea
                required
                minLength={10}
                maxLength={5000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us what is incorrect and what the information should say instead."
                data-testid="textarea-correction-message"
              />
            </label>
            <label className="field-label">
              Supporting source <span className="optional">optional</span>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(event) =>
                  setForm({ ...form, sourceUrl: event.target.value })
                }
                placeholder="https://clinic-website.example/update"
                aria-describedby="source-help"
                data-testid="input-correction-source"
              />
              <span className="field-help" id="source-help">
                Add a clinic website or another public page that supports the
                change.
              </span>
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
              <span className="field-help">
                We’ll only use this if we need to clarify your suggestion.
              </span>
            </label>
            <Button
              type="submit"
              className="submit-button"
              disabled={submitCorrection.isPending}
              data-testid="button-submit-correction"
            >
              {submitCorrection.isPending ? "Sending…" : "Send suggestion"}{" "}
              <ArrowRight size={17} />
            </Button>
            {submitCorrection.isError && (
              <p className="form-error">
                We couldn’t send your suggestion. Please check the form and try
                again.
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
              <strong>What helps most</strong> Tell us what is wrong, what the
              correct information should be, and where you found it.
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
