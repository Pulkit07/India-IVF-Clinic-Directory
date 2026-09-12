import { PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function Privacy() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Privacy principles"
        title="Less data, more care."
        description="The directory should be useful without asking for more than it needs."
      />
      <div className="shell-inner legal-copy">
        <h2>Our approach</h2>
        <p>
          This demonstration interface is designed around data minimisation.
          Public browsing does not require an account. We do not ask for health
          information to search clinics.
        </p>
        <h2>Correction messages</h2>
        <p>
          If you submit a correction, we receive the clinic reference, your
          message and contact email. We use these details to review the note and
          follow up when needed. Please do not include medical records or
          sensitive personal health information.
        </p>
        <h2>Cookies and analytics</h2>
        <p>
          This prototype does not describe a commercial advertising profile. Any
          operational logging should be limited to keeping the service secure
          and functioning.
        </p>
        <h2>Questions</h2>
        <p>
          For a privacy question about this demonstration, use the correction
          channel and identify it as a privacy question.
        </p>
      </div>
    </Shell>
  );
}
