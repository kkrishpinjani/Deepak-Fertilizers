import PageHeader from "@/components/PageHeader";
import AskCortex from "@/components/AskCortex";

export default function AskPage({ searchParams }: { searchParams: { q?: string } }) {
  return (
    <>
      <PageHeader
        eyebrow="Executive · Ask a Question"
        title="Ask a Business Question"
        takeaway="Type a question in plain English — no table or column names required — and get a direct answer sourced from the live finance model, with the numbers behind it."
      />
      <AskCortex initialQuestion={searchParams?.q} />
    </>
  );
}
