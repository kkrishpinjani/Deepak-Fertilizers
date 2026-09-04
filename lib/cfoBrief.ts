import { runQuery } from "@/lib/db";
import type { BriefItem } from "@/components/CFOBrief";

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

// Rule-derived "what needs attention" list, shared by the CFO Copilot page
// (server-rendered) and the header notification bell (client fetch via
// /api/copilot/brief) — same real SQL, two presentations.
export async function getBriefItems(): Promise<BriefItem[]> {
  const [summary] = await runQuery<{ actual_revenue: number; budget_revenue: number; revenue_variance: number }>(`
    SELECT SUM(actual_revenue) AS actual_revenue, SUM(budget_revenue) AS budget_revenue, SUM(revenue_variance) AS revenue_variance
    FROM conformed.sales_performance;
  `);
  const [finance] = await runQuery<{ financial_variance: number; budget_amount: number }>(`
    SELECT SUM(financial_variance) AS financial_variance, SUM(budget_amount) AS budget_amount
    FROM conformed.finance_performance;
  `);
  const wc = await runQuery<{ month: string; accounts_receivable: number }>(`
    SELECT DATE_FORMAT(date_key, '%b %Y') AS month, accounts_receivable
    FROM conformed.working_capital_summary
    ORDER BY date_key;
  `);

  const items: BriefItem[] = [];

  const revVariance = Number(summary.revenue_variance);
  const revPct = (Math.abs(revVariance) / Number(summary.budget_revenue)) * 100;
  if (revPct >= 1) {
    items.push({
      title: "Revenue",
      detail: `${fmt(Math.abs(revVariance))} ${revVariance >= 0 ? "above" : "below"} plan`,
      impact: revPct >= 5 ? "High" : "Medium",
      question: "Why is revenue below plan this month?",
    });
  }

  const costVariance = Number(finance.financial_variance);
  const costPct = (Math.abs(costVariance) / Number(finance.budget_amount)) * 100;
  if (costPct >= 1 && costVariance > 0) {
    items.push({
      title: "Operating Costs",
      detail: `${fmt(costVariance)} above budget`,
      impact: costPct >= 5 ? "High" : "Medium",
      question: "What caused the increase in operating costs?",
    });
  }

  if (wc.length >= 2) {
    const first = Number(wc[0].accounts_receivable);
    const last = Number(wc[wc.length - 1].accounts_receivable);
    const arPct = ((last - first) / first) * 100;
    if (Math.abs(arPct) >= 2) {
      items.push({
        title: "Working Capital",
        detail: `Receivables ${arPct >= 0 ? "increased" : "decreased"} ${Math.abs(arPct).toFixed(1)}%`,
        impact: Math.abs(arPct) >= 8 ? "High" : "Medium",
        question: "What are the biggest working-capital risks?",
      });
    }
  }

  return items;
}
