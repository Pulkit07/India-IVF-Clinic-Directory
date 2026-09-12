import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Eyebrow } from "@/components/directory";
import { Shell } from "@/components/site-shell";

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(
      `/clinics${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
    );
  };

  return (
    <Shell>
      <section className="home-intro shell-inner">
        <Eyebrow>India IVF clinic directory</Eyebrow>
        <h1>
          IVF success rates.
          <br />
          <em>Clearly explained.</em>
        </h1>
        <p className="home-summary">
          A clinic’s success rate tells only part of the story. What counts as
          success—and who gets counted—can change the number.
        </p>
        <p className="home-definitions-copy">
          OpenIVF brings together Indian IVF clinics, their reported rates and
          the definitions behind them.
        </p>
        <form className="search-box" onSubmit={submit}>
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by clinic or city"
            aria-label="Search by clinic or city"
            data-testid="input-home-search"
          />
          <button
            type="submit"
            aria-label="Find clinics"
            data-testid="button-home-search"
          >
            <ArrowRight size={20} />
          </button>
        </form>
        <Link
          href="/clinics"
          className="text-link home-browse"
          data-testid="link-browse-clinics"
        >
          Browse all clinics <ArrowRight size={16} />
        </Link>
      </section>

      <section
        className="home-definitions shell-inner"
        aria-labelledby="home-definitions-title"
      >
        <div className="section-heading">
          <div>
            <Eyebrow>Understanding the numbers</Eyebrow>
            <h2 id="home-definitions-title">What does “success” mean?</h2>
          </div>
          <Link
            href="/glossary"
            className="text-link"
            data-testid="link-home-glossary"
          >
            Behind the rates <ArrowRight size={16} />
          </Link>
        </div>
        <p className="home-definitions-copy">
          A percentage needs two definitions: what was counted as success, and
          which treatment cycles were included.
        </p>
        <div className="home-definition-grid">
          <article>
            <span className="detail-label">The outcome</span>
            <h3>Pregnancy or live birth?</h3>
            <p>
              A clinic may report clinical pregnancies or live births. These
              measure different outcomes.
            </p>
          </article>
          <article>
            <span className="detail-label">The denominator</span>
            <h3>Out of which cycles?</h3>
            <p>
              A rate may be calculated per cycle started, egg retrieval, or
              embryo transfer.
            </p>
          </article>
          <article>
            <span className="detail-label">The context</span>
            <h3>For whom, and when?</h3>
            <p>
              Age, egg source and reporting period help explain who a rate
              describes.
            </p>
          </article>
        </div>
      </section>

      <section
        className="home-purpose shell-inner"
        aria-labelledby="home-purpose-title"
      >
        <div>
          <Eyebrow>Why this directory exists</Eyebrow>
          <h2 id="home-purpose-title">A higher number needs a closer look.</h2>
        </div>
        <div>
          <p>
            Counting only selected patients or leaving some treatment cycles out
            can make a reported rate look higher. Without those details, two
            percentages can appear comparable even when they measure different
            things.
          </p>
          <p>
            We put each reported rate beside its definition and source so you
            can see what it includes, what is missing, and what to ask the
            clinic.
          </p>
          <Link
            href="/glossary"
            className="text-link"
            data-testid="link-home-methodology"
          >
            Understand success rates <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <div className="shell-inner home-data-note">
        <p>
          Currently showing fictional demonstration records. Reported rates
          describe past outcomes and do not predict an individual’s result.
        </p>
      </div>
    </Shell>
  );
}
