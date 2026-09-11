import { Link } from 'wouter';

const metrics = [
  ['Beta-hCG positive rate', 'Positive pregnancy tests based on beta-hCG (human chorionic gonadotropin) ÷ the stated cycle or transfer count × 100.', 'An early biochemical indication of pregnancy; it does not establish a clinical pregnancy or live birth. Check the testing time and positivity threshold.'],
  ['Clinical pregnancy rate', 'Clinically confirmed pregnancies ÷ the stated cycle or transfer count × 100.', 'Usually confirmed by ultrasound evidence of a gestational sac, or definitive clinical signs. It does not mean a baby was born.'],
  ['Ongoing pregnancy rate', 'Pregnancies continuing to a specified gestational week ÷ the stated denominator × 100.', 'The week and confirmation criteria must be stated. Follow-up to birth is still needed.'],
  ['Live-birth delivery rate', 'Deliveries with at least one live-born baby ÷ the stated cycle or transfer count × 100.', 'Counts deliveries, not babies: a twin delivery counts once. Check the denominator and completeness of birth follow-up.'],
  ['Implantation rate', 'Gestational sacs observed ÷ embryos transferred × 100.', 'An embryo-level measure, not the percentage of patients taking home a baby.'],
  ['Singleton live-birth delivery rate', 'Deliveries with one live-born baby ÷ the stated cycle or transfer count × 100.', 'Read alongside multiple-birth outcomes. “Singleton” alone does not describe every aspect of maternal or infant health.'],
];

const denominators = [
  ['Per started cycle / intended retrieval', 'Includes attempts begun with the intention of retrieving eggs, including cancellations under the reporting rules.', 'Shows outcomes from an earlier starting point. Check how starts, cancellations and embryo banking are defined.'],
  ['Per egg retrieval', 'Counts procedures performed to collect eggs.', 'Excludes attempts cancelled before retrieval. Ask whether all later transfers from those eggs are included.'],
  ['Per embryo transfer', 'Counts procedures placing one or more embryos into the uterus.', 'Excludes attempts that never reached transfer. One person may contribute several transfers.'],
  ['Per embryo transferred', 'Counts individual embryos placed in the uterus.', 'Different from transfer procedures: a procedure may involve more than one embryo. Do not compare the two denominators directly.'],
  ['Per patient', 'Counts distinct people in a defined treatment group.', 'May cover one or several attempts. The number of attempts and observation period must be specified.'],
  ['Cumulative live-birth rate', 'Counts people or retrieval cohorts achieving at least one live-birth delivery across linked attempts, divided by the original defined cohort.', 'Specify whether this covers transfers from one retrieval or multiple retrievals, the time window, and how people who stop treatment are handled. Do not add individual transfer percentages together.'],
];

const parameters = [
  ['Numerator', 'The number of qualifying outcomes at the top of the calculation. Specify pregnancies, deliveries or babies.'],
  ['Denominator', 'The number of eligible cycles, procedures, embryos or patients at the bottom of the calculation.'],
  ['Age band', 'The age group represented. State whether age was measured at egg retrieval, transfer or another point.'],
  ['Egg source', 'Own eggs, donor eggs or donated embryos. These groups should be identified separately.'],
  ['Fresh / frozen transfer', 'Whether embryos are transferred without prior freezing or after thawing. This is distinct from egg source.'],
  ['IVF / ICSI', 'IVF fertilizes eggs outside the body; ICSI injects a single sperm into an egg. Specify the treatment represented.'],
  ['Patient group (cohort)', 'The people included: for example, first treatment versus previous attempts, with stated eligibility criteria.'],
  ['Embryo selection', 'Embryo stage, testing status and number transferred. Results for a selected group do not describe every patient starting treatment.'],
  ['Reporting period', 'The dates covered and whether records are grouped by treatment start, retrieval, transfer or birth year.'],
  ['Follow-up window', 'How long outcomes were tracked. Pending or missing outcomes need explicit handling.'],
  ['Sample size', 'The actual count behind a percentage. In an illustrative group of 10, one additional outcome changes the rate by 10 percentage points.'],
  ['Confidence interval', 'A statistical range expressing uncertainty around an estimate. It is not a range of personal success probabilities.'],
  ['Source / verification', 'Where a claim originated and what checks were performed. Reading a source does not independently audit its underlying patient records.'],
];

function Reference({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

export function SuccessRateGuide() {
  return <div className="shell-inner success-guide">
    <nav className="guide-jumps" aria-label="Guide sections">
      <span className="eyebrow">In this guide</span>
      {[['problem', 'The problem'], ['recommended', 'What clinics should share'], ['approach', 'Our role'], ['metrics', 'Key metrics'], ['calculations', 'Calculations'], ['pitfalls', 'Reporting pitfalls'], ['parameters', 'Key parameters'], ['questions', 'What to ask']].map(([id, label], index) => <a key={id} href={'#' + id}><span>{String(index + 1).padStart(2, '0')}</span>{label}</a>)}
    </nav>

    <section id="problem">
      <p className="eyebrow">The problem</p><h2>“Success” can mean different things.</h2>
      <p>A percentage on its own leaves crucial questions unanswered: was it a pregnancy or a birth? Were all treatment starts counted, or only those reaching transfer? Which patients were included?</p>
      <p>Selective reporting can make a number look more favorable. Different definitions can also be legitimate, but they answer different questions. A difference in rates alone does not establish a difference in clinic quality or prove manipulation.</p>
    </section>

    <section id="recommended" className="guide-recommendation">
      <p className="eyebrow">What we recommend asking clinics to share</p>
      <h2>Live births, measured from the start.</h2>
      <p>For someone beginning IVF with their own eggs, a useful headline is the <strong>cumulative live-birth delivery rate per intended egg retrieval</strong>, broken down by age at egg retrieval. This follows the attempt from its start, including those that never reach transfer.</p>
      <div className="recommended-formula"><span>Intended retrieval attempts resulting in at least one live-birth delivery from linked transfers</span><span>All intended retrieval attempts in that defined cohort, including cancellations</span><b>× 100</b></div>
      <p>Specify which transfers count and the follow-up window—for example, transfers within one year of retrieval, as in CDC reporting. Count each successful retrieval attempt once. State the number of pending or unknown outcomes and how they affect the calculation.</p>
      <div className="recommendation-details">
        <div><h3>Publish alongside it</h3><p>Actual counts, age bands, egg source, dates, follow-up completeness and confidence intervals. Show donor-egg results separately, plus per-transfer live-birth and singleton/multiple-birth outcomes.</p></div>
        <div><h3>Read it with context</h3><p>No single metric describes every patient or clinic. This is a recommendation for clearer reporting, not a target percentage or a new calculation method. A started retrieval rate and a started frozen-transfer rate are different measures.</p></div>
      </div>
      <p className="guide-reference">Based on established reporting: <Reference href="https://www.cdc.gov/art/success-rates/index.html">CDC cumulative outcomes</Reference>. Other established measures answer complementary questions, including <Reference href="https://www.hfea.gov.uk/choose-a-fertility-clinic">HFEA clinic measures</Reference>.</p>
    </section>

    <section id="approach">
      <p className="eyebrow">OpenIVF’s approach</p><h2>Make the claim readable and traceable.</h2>
      <div className="guide-cards">
        <article><h3>Keep the definition</h3><p>Present the reported outcome, denominator and patient context alongside the rate.</p></article>
        <article><h3>Show the source</h3><p>Link to the original claim and distinguish source review from independent verification.</p></article>
        <article><h3>Expose the gaps</h3><p>Identify missing information. An unspecified definition stays unspecified; it cannot support a fair comparison.</p></article>
      </div>
      <p>OpenIVF explains existing measures and presents reported claims with their sources. We do not devise a separate success-rate formula.</p>
    </section>

    <section id="metrics">
      <p className="eyebrow">Key metrics</p><h2>First, define the outcome.</h2>
      <p>The denominator must accompany every rate. A pregnancy milestone and a live birth are different endpoints.</p>
      <div className="guide-cards guide-metrics">{metrics.map(([name, definition, limitation]) => <article key={name}><h3>{name}</h3><p>{definition}</p><p className="guide-limitation"><strong>What to watch:</strong> {limitation}</p></article>)}</div>
      <p className="guide-reference">Terminology: <Reference href="https://www.icmartivf.org/glossary/">ICMART international glossary</Reference>. These are plain-language summaries; retain each reporting source’s exact criteria.</p>
    </section>

    <section id="calculations">
      <p className="eyebrow">Ways of calculating</p><h2>Then, ask “out of what?”</h2>
      <p className="guide-formula">Rate (%) = qualifying outcomes ÷ eligible total × 100</p>
      <p>The numerator and denominator must refer to the same defined group and follow-up period.</p>
      <div className="guide-table-wrap" tabIndex={0} role="region" aria-label="Calculation methods and limitations"><table className="guide-table"><thead><tr><th scope="col">Method</th><th scope="col">What is counted</th><th scope="col">Limitations / questions</th></tr></thead><tbody>{denominators.map(([name, definition, limitation]) => <tr key={name}><th scope="row">{name}</th><td>{definition}</td><td>{limitation}</td></tr>)}</tbody></table></div>
      <p className="guide-reference">Reporting examples: <Reference href="https://www.cdc.gov/art/success-rates/interpret.html">CDC calculation guide</Reference> and <Reference href="https://www.hfea.gov.uk/about-us/hfea-dashboard">HFEA measures per embryo transferred</Reference>. These illustrate international reporting methods, not mandatory rules for Indian clinics.</p>
      <div className="guide-example">
        <p className="eyebrow">Fictional worked example</p><h3>Same results. Three different percentages.</h3>
        <p>Suppose 100 cycles start, 80 reach egg retrieval, and 60 reach one transfer each. Those transfers lead to 24 live-birth deliveries. Assume complete follow-up and no further transfers in this example.</p>
        <div className="guide-cards"><article><strong>24%</strong><p>24 ÷ 100 starts × 100</p></article><article><strong>30%</strong><p>24 ÷ 80 retrievals × 100</p></article><article><strong>40%</strong><p>24 ÷ 60 transfers × 100</p></article></div>
        <p>No additional births occurred when the rate changed from 24% to 40%. The denominator changed. All three calculations can be correct when clearly labeled.</p>
      </div>
      <h3>Cumulative does not mean adding percentages.</h3>
      <p>Illustration: among 100 retrieval cohorts, 24 achieve a live birth after a first transfer and 10 other cohorts do so after later transfers. The observed cumulative result is 34 ÷ 100 = 34%, within the stated follow-up window. Count each successful cohort once.</p>
    </section>

    <section id="pitfalls">
      <p className="eyebrow">Common reporting pitfalls</p><h2>When “success” leaves part of the story out.</h2>
      <p>These measures can be useful when clearly labeled. The problem arises when an early milestone, a selected group or a different starting point is presented as everyone’s chance of having a baby.</p>
      <div className="guide-pitfalls">
        <details><summary>Beta-hCG positive called “success”</summary><p>A positive test is an early milestone. Some pregnancies do not progress to ultrasound confirmation or birth, so this rate cannot stand in for live-birth outcomes.</p><p className="guide-limitation"><strong>Ask:</strong> What test threshold and timing were used, and how many of these pregnancies resulted in a live-birth delivery?</p></details>
        <details><summary>Starting the count at embryo transfer</summary><p>Per-transfer rates include only attempts reaching transfer. Cycles cancelled earlier, or with no embryo available for transfer, are outside that denominator. The rate answers a narrower question than outcomes from cycle start.</p><p className="guide-limitation"><strong>Ask:</strong> What is the live-birth rate per started cycle, and how many starts never reached transfer? A frozen transfer cycle and a retrieval cycle also have different starting points.</p></details>
        <details><summary>Pregnancy or heartbeat presented as a birth</summary><p>Ultrasound confirmation or fetal heart activity establishes a pregnancy milestone, not a completed live-birth outcome. “Ongoing” also needs a stated gestational week.</p><p className="guide-limitation"><strong>Ask:</strong> Was follow-up continued to delivery? Are pregnancy and live-birth rates shown separately?</p></details>
        <details><summary>One headline for different patient groups</summary><p>A pooled rate conceals the mixture of ages, own versus donor eggs and previous treatment histories. A selected subgroup’s result cannot automatically be applied to everyone.</p><p className="guide-limitation"><strong>Ask:</strong> Which group does the figure represent, who was excluded, and is there a separate result for the relevant age and egg source?</p></details>
        <details><summary>“Up to” a high percentage</summary><p>A best-performing subgroup or period is different from the whole clinic’s result. Without selection criteria and actual counts, the scope of the claim is unclear.</p><p className="guide-limitation"><strong>Ask:</strong> Is this the overall result or a selected maximum? What dates, numerator and denominator support it?</p></details>
        <details><summary>Cumulative success without a limit</summary><p>A result across several attempts is not a single-attempt rate. Reporting only people who completed treatment can also leave out those who stopped or were lost to follow-up.</p><p className="guide-limitation"><strong>Ask:</strong> How many retrievals or transfers, over what period? Were all original participants retained in the calculation, and is the rate observed or estimated?</p></details>
        <details><summary>Babies counted instead of deliveries</summary><p>One twin delivery produces two babies but only one delivery. Switching the numerator changes the question being answered. A headline count alone does not describe safety.</p><p className="guide-limitation"><strong>Ask:</strong> Are you counting babies, deliveries or patients with a live birth? Are singleton and multiple-birth outcomes reported?</p></details>
        <details><summary>A precise percentage with missing counts</summary><p>In a fictional sample, 9 successes out of 10 is 90%, but one fewer success makes it 80%. Small samples, incomplete follow-up and cherry-picked periods can make a headline unstable or unrepresentative.</p><p className="guide-limitation"><strong>Ask:</strong> How many cases support the rate? What outcomes are pending or unknown, and where can I inspect the source?</p></details>
      </div>
      <p className="guide-reference">Further reading: <Reference href="https://www.gov.uk/government/publications/fertility-treatment-a-guide-to-your-consumer-rights/a-guide-to-your-consumer-rights">CMA guidance on fertility success-rate claims</Reference>, <Reference href="https://www.cdc.gov/art/success-rates/interpret.html">CDC interpretation guide</Reference> and <Reference href="https://www.hfea.gov.uk/choose-a-fertility-clinic">HFEA clinic measures</Reference>. These explain reporting concepts; they are not evidence of misconduct by any listed clinic.</p>
    </section>

    <section id="parameters">
      <p className="eyebrow">Key parameters</p><h2>The details that make a rate interpretable.</h2>
      <dl className="guide-terms">{parameters.map(([name, definition]) => <div key={name}><dt>{name}</dt><dd>{definition}</dd></div>)}</dl>
      <p className="guide-reference">Patient and treatment context: <Reference href="https://www.cdc.gov/art/success-rates/index.html">CDC success-rate overview</Reference>. Group averages do not predict an individual’s outcome.</p>
    </section>

    <section id="questions">
      <p className="eyebrow">Before comparing</p><h2>Ask for the full sentence behind the number.</h2>
      <ul className="guide-questions">
        <li>What outcome is counted, and how was it confirmed?</li>
        <li>What is the numerator and denominator? Are cancelled cycles included?</li>
        <li>Which ages, egg sources and patient groups does this cover?</li>
        <li>Is this one transfer, or a cumulative result across several attempts?</li>
        <li>What dates, follow-up window and sample size support the claim?</li>
        <li>How are missing outcomes handled, and can I read the original source?</li>
      </ul>
      <p>Compare only when these definitions align. A higher percentage for a selected group does not establish a higher chance for everyone. Missing data means the claim needs clarification.</p>
      <Link href="/clinics" className="btn btn-primary">Find a clinic →</Link>
    </section>
  </div>;
}
