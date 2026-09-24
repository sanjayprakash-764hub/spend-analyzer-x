import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Spend Manager" },
      { name: "description", content: "What Spend Manager collects, why, how it is stored, how AI uses it, and how to delete it." },
      { property: "og:title", content: "Privacy Policy · Spend Manager" },
      { property: "og:description", content: "How Spend Manager handles your expense data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="24 September 2026">
      <p>Spend Manager is a personal expense tracker. This policy explains what we collect and how we use it.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your email address, name, and sign-in method (email/password or Google).</li>
        <li>Expense data you enter: amount, merchant, category, date, payment method and notes.</li>
        <li>Budgets you set.</li>
        <li>Assistant chat history is kept only on your device, not on our servers.</li>
      </ul>
      <p>We never ask for or store UPI PINs, card numbers, CVVs or bank passwords. Spend Manager does not connect to your bank and cannot move money.</p>
      <h2>Why we collect it</h2>
      <p>Only to provide the app: showing your spending, budgets, charts and answers to your questions.</p>
      <h2>How your data is stored</h2>
      <p>Data is stored in a hosted cloud database and sent over encrypted (HTTPS) connections. Access rules ensure each account can only read its own expenses and budgets. No system is perfectly secure, but we take reasonable measures to protect your data.</p>
      <h2>AI features</h2>
      <p>When you use category suggestions, the merchant name and notes are sent to a third-party AI model provider through our AI gateway. When you ask the assistant a question, your question and the relevant expense summaries are sent to that provider to write the answer. All totals are calculated by our own system, not by the AI. AI answers can be wrong and are not financial advice.</p>
      <h2>Receipt images</h2>
      <p>Spend Manager does not currently offer receipt scanning and does not collect receipt images. If this is added later, this policy will be updated before it launches.</p>
      <h2>Retention and deletion</h2>
      <p>We keep your data while your account exists. You can delete your account at any time from Settings → Delete account. This permanently removes your login, expenses, budgets and profile immediately. Backups held by our hosting provider expire on their normal schedule.</p>
      <h2>Sharing</h2>
      <p>We do not sell your data or use it for advertising.</p>
      <h2>Contact</h2>
      <p>Questions or requests: <a className="underline" href="mailto:support@spendmanager.app">support@spendmanager.app</a></p>
    </LegalPage>
  );
}
