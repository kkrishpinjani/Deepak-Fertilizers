import PageHeader from "@/components/PageHeader";
import BusinessGlossary from "@/components/BusinessGlossary";

export default function GlossaryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data & Governance · Glossary"
        title="Glossary"
        takeaway="What the terms on this site mean — plain-English definitions, the business meaning behind them, and how each one is actually calculated, so everyone reads the numbers the same way."
      />
      <BusinessGlossary />
    </>
  );
}
