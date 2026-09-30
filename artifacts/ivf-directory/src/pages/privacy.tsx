import { Link } from "wouter";
import { PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function Privacy() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Privacy policy"
        title="Your privacy at OpenIVF"
        description="How OpenIVF collects, uses and protects information when you use the directory."
      />
      <article className="shell-inner legal-copy">
        <p className="legal-updated"><strong>Last updated:</strong>{" "}<time dateTime="2026-09-30">30 September 2026</time></p>

        <h2>Who this policy applies to</h2>
        <p>
          This policy applies to OpenIVF, a public directory of IVF clinics in
          India operated by Pulkit Goyal. It covers visitors, people who suggest
          corrections and authorised directory administrators.
        </p>

        <h2>Information we collect</h2>
        <p>
          You can browse and search the public directory without creating an
          account. We do not ask for medical records or information about your
          fertility treatment to provide public search.
        </p>
        <p>We may collect:</p>
        <ul>
          <li><strong>Correction information:</strong> the clinic, correction category, your message, any supporting link and your email address.</li>
          <li><strong>Administrator information:</strong> account details supplied through Google sign-in and records of changes made to directory data.</li>
          <li><strong>Technical information:</strong> information generated when the site is requested or used, such as IP address, browser or device information, request times and security or error logs. Our hosting and infrastructure providers may process this information.</li>
        </ul>

        <h2>How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>operate, secure, troubleshoot and improve the directory;</li>
          <li>review corrections, verify sources and contact you if clarification is needed;</li>
          <li>authenticate administrators and maintain an audit trail of directory changes; and</li>
          <li>comply with applicable law and protect users, OpenIVF and the public.</li>
        </ul>
        <p>
          Please do not submit medical records, government identification
          numbers or other sensitive personal information in a correction.
        </p>

        <h2>Service providers and disclosure</h2>
        <p>
          OpenIVF uses Google Firebase for hosting, authentication, database and
          related infrastructure. Correction details may also be processed by
          Resend to deliver an email notification to the directory operator.
          These providers process information to supply their services and may
          process it outside India under their own safeguards.
        </p>
        <p>
          We may also disclose information when required by law, to respond to a
          valid legal request, or when reasonably necessary to prevent fraud,
          abuse or a threat to safety. We do not sell personal information or
          use correction submissions for advertising.
        </p>

        <h2>Cookies and similar storage</h2>
        <p>
          OpenIVF does not currently use advertising cookies or a third-party
          analytics service. Firebase Authentication may use browser storage to
          maintain an administrator’s sign-in session. Links to clinic websites,
          sources, maps and other third-party sites are governed by those sites’
          privacy practices after you follow them.
        </p>

        <h2>Retention and security</h2>
        <p>
          We keep personal information only for as long as reasonably necessary
          for the purposes described above, including resolving corrections,
          maintaining security and audit records, and meeting legal obligations.
          Retention may be longer where records must be preserved for a legal
          claim or in secure backups.
        </p>
        <p>
          We use access controls, database security rules and restricted
          administrator access to protect information. No internet service can
          guarantee absolute security, so please avoid sending information the
          directory does not need.
        </p>

        <h2>Your choices and requests</h2>
        <p>
          You may ask to access, correct or delete personal information you have
          submitted, withdraw a correction, or raise a privacy concern. We may
          need to verify your identity before acting on a request, and some
          information may be retained where required for security, legal or
          record-keeping reasons.
        </p>

        <h2>Children</h2>
        <p>
          OpenIVF is intended for adults researching fertility care. We do not
          knowingly collect personal information from children through the
          correction form. If you believe a child has provided personal
          information, please contact us so we can review it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as the directory or applicable requirements
          change. The date at the top shows when it was last revised. Material
          changes will be highlighted on this page where appropriate.
        </p>

        <h2>Contact</h2>
        <p>
          For a privacy request or question, contact Pulkit Goyal through the
          contact profile linked on the <Link href="/about">About page</Link>.
          Include “OpenIVF privacy” in your message and do not send medical
          records or other sensitive health information.
        </p>
      </article>
    </Shell>
  );
}
