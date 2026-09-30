import { PageIntro } from "@/components/directory";
import { Shell } from "@/components/site-shell";
import { SuccessRateGuide } from "@/components/success-rate-guide";

export default function Glossary() {
  return (
    <Shell>
      <PageIntro
        eyebrow="The OpenIVF guide"
        title="Understanding Success Rates"
        description="What success means, how it is calculated, and what a percentage can leave out."
      />
      <SuccessRateGuide />
    </Shell>
  );
}
