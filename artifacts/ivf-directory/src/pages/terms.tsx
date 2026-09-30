import { Link } from "wouter";
import { PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function Terms() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Terms of use"
        title="Use the directory thoughtfully."
        description="The terms for browsing OpenIVF and contributing to this public directory."
      />
      <article className="shell-inner legal-copy">
        <p className="legal-updated">
          <strong>Effective date:</strong>{" "}
          <time dateTime="2026-09-30">30 September 2026</time>
        </p>

        <h2>About these terms</h2>
        <p>
          OpenIVF is a public directory of IVF clinics in India operated by
          Pulkit Goyal. In these terms, “we”, “us” and “our” refer to the
          operator of OpenIVF. These terms apply when you browse the directory
          or submit a correction. By using OpenIVF, you agree to these terms;
          if you do not agree, please stop using the directory.
        </p>

        <h2>Information only</h2>
        <p>
          OpenIVF provides general information for research and orientation. It
          is not medical advice, diagnosis, treatment, referral, or a guarantee
          of outcomes.
        </p>
        <h2>Sources and records</h2>
        <p>
          Records are presented with their sources and review dates where
          available. You are responsible for checking details with the clinic
          and a qualified clinician before making decisions.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Use OpenIVF lawfully and respect other people’s rights. You must not:
        </p>
        <ul>
          <li>submit false or misleading reports, impersonate another person, or claim an affiliation you do not have;</li>
          <li>submit abusive, unlawful or infringing content, spam or unrelated marketing;</li>
          <li>upload malicious code, disrupt the service, overload it with automated requests, or bypass security or access controls; or</li>
          <li>attempt to access administrator accounts or non-public information without authorisation.</li>
        </ul>

        <h2>Corrections and submissions</h2>
        <p>
          Use the <Link href="/corrections">correction form</Link> for specific,
          good-faith reports supported by sources where possible. Submit only
          material you have the right to share. Do not include medical records,
          private health information or other sensitive personal information.
          We may verify, edit, decline or remove submissions and cannot promise
          that every correction will be published or acted on within a set time.
        </p>
        <p>
          You retain any rights you hold in your submission. By submitting it,
          you give us a non-exclusive, royalty-free permission to review,
          reproduce and adapt it as needed to maintain the directory and publish
          corrected clinic information. This permission does not authorise
          publication of your contact details. Our <Link href="/privacy">Privacy
          policy</Link> explains how we handle personal information.
        </p>

        <h2>Intellectual property</h2>
        <p>
          Original OpenIVF text, design and branding belong to their respective
          rights holders. Clinic names, trademarks, source publications and
          other third-party material remain the property of their owners;
          inclusion does not imply affiliation or grant a licence to their
          material. We do not claim ownership of underlying public facts.
        </p>
        <p>
          You may link to the directory and quote brief extracts of our original
          content with attribution to OpenIVF and a link to the relevant page.
          For other reuse of protected content, obtain the rights holder’s
          permission unless applicable law or a separate licence permits it.
          Any separately licensed software or material remains governed by its
          own licence. To report a rights concern, use the contact route below
          and identify the page, material and basis of your claim.
        </p>

        <h2>Third-party services</h2>
        <p>
          Links to clinic websites, maps and sources are provided for reference.
          We do not control their content, availability or practices. Your
          dealings with a clinic or another service provider are between you
          and that provider and are subject to their terms.
        </p>

        <h2>Disclaimers and liability</h2>
        <p>
          The directory is provided “as is” and “as available”. To the extent
          permitted by applicable law, we make no warranties about its accuracy,
          completeness, fitness for a particular purpose or uninterrupted
          availability. Information may be incomplete or out of date, and
          reported success rates do not predict an individual’s outcome.
        </p>
        <p>
          To the extent permitted by applicable law, OpenIVF and its operator
          are not liable for indirect or consequential losses, loss of profits,
          loss of data or loss of opportunity arising from use of, or inability
          to use, the directory. Nothing in these terms excludes or limits
          liability that cannot lawfully be excluded or limited, or removes
          rights or remedies you have under applicable law.
        </p>

        <h2>Availability</h2>
        <p>
          We may change, pause or remove parts of the directory as the project
          develops. A clinic’s inclusion is not an endorsement.
          We may restrict access where reasonably necessary to address misuse
          or protect the service and its users.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of India. Disputes may be brought
          before courts or other competent forums with jurisdiction under
          applicable law. These terms do not limit any mandatory protections
          or rights available to you under applicable law.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as the directory develops. Revised terms
          will be posted here with an updated effective date, and material
          changes will be highlighted on this page. Changes apply from the
          stated effective date. Please review the terms when you return.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about these terms or intellectual-property concerns,
          contact Pulkit Goyal through the contact profile linked on the{" "}
          <Link href="/about">About page</Link>. Include “OpenIVF terms” in
          your message and the relevant page link. Please do not send medical
          records or other sensitive health information. For clinic listing
          updates, use the <Link href="/corrections">correction form</Link>.
        </p>
      </article>
    </Shell>
  );
}
