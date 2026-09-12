import { PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function Terms() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Terms"
        title="Use the directory thoughtfully."
        description="A few plain-language boundaries for using this public reference."
      />
      <div className="shell-inner legal-copy">
        <h2>Information only</h2>
        <p>
          OpenIVF provides general information for research and orientation. It
          is not medical advice, diagnosis, treatment, referral, or a guarantee
          of outcomes.
        </p>
        <h2>Sources and demonstration records</h2>
        <p>
          Records are presented with their sources and review dates where
          available. Some records are fictional demonstration data. You are
          responsible for checking details with the clinic and a qualified
          clinician before making decisions.
        </p>
        <h2>Respectful corrections</h2>
        <p>
          Use the correction form for specific, good-faith reports. Do not
          submit private health information, abusive content or unrelated
          marketing.
        </p>
        <h2>Availability</h2>
        <p>
          We may change, pause or remove parts of the directory as the project
          develops. A clinic’s inclusion is not an endorsement.
        </p>
      </div>
    </Shell>
  );
}
