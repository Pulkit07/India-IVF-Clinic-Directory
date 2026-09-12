import { ArrowRight } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { Link } from "wouter";
import { Eyebrow, PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function About() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Behind the directory"
        title="Clarity for a deeply personal decision."
        description="Explore IVF clinics in India and understand the context behind their reported success rates."
      />
      <div className="shell-inner about-story">
        <article>
          <section className="about-mission">
            <Eyebrow>Why OpenIVF</Eyebrow>
            <h2>A percentage doesn’t tell the whole story.</h2>
            <p>
              Success rates depend on the outcome measured, the patients
              included and how cycles are counted. OpenIVF brings these details
              together so you can ask better questions.
            </p>
            <Link href="/glossary" className="text-link">
              Go behind the rates <ArrowRight size={16} />
            </Link>
          </section>
          <section>
            <Eyebrow>What you’ll find</Eyebrow>
            <h2>A starting point for your research.</h2>
            <div className="about-promises">
              <div>
                <span>01</span>
                <div>
                  <h3>Clinics by location</h3>
                  <p>Explore clinics by city and locality.</p>
                </div>
              </div>
              <div>
                <span>02</span>
                <div>
                  <h3>Results with context</h3>
                  <p>
                    Find definitions, patient groups, reporting periods and
                    sources where available.
                  </p>
                </div>
              </div>
              <div>
                <span>03</span>
                <div>
                  <h3>Visible information gaps</h3>
                  <p>
                    See what’s published and what still needs clarification.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </article>
        <aside className="about-builder">
          <Eyebrow>The person behind OpenIVF</Eyebrow>
          <div className="about-builder-heading">
            <h2>Pulkit Goyal</h2>
            <a
              href="https://www.linkedin.com/in/pulkitg25/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-linkedin"
              aria-label="Pulkit Goyal on LinkedIn (opens in a new tab)"
              title="Pulkit Goyal on LinkedIn"
              data-testid="link-builder-linkedin"
            >
              <FaLinkedin size={22} aria-hidden="true" />
            </a>
          </div>
          <p className="about-builder-role">Building OpenIVF</p>
          <p>
            I’m building OpenIVF to help people navigate IVF research with
            clearer, source-backed information.
          </p>
          <div className="about-builder-note">
            <strong>Our limits</strong>
            <p>
              Listings are not endorsements. Source reviews are not independent
              audits of clinic records.
            </p>
          </div>
        </aside>
      </div>
      <section className="shell-inner about-next">
        <div>
          <Eyebrow>Help improve OpenIVF</Eyebrow>
          <h2>Spot something missing or outdated?</h2>
          <p>Send a correction with a supporting source.</p>
        </div>
        <Link href="/corrections" className="btn btn-outline">
          Suggest a correction <ArrowRight size={16} />
        </Link>
      </section>
    </Shell>
  );
}
