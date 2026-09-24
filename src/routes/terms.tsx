import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Spend Manager" },
      { name: "description", content: "Terms for using Spend Manager, an expense tracking and spending analysis app." },
      { property: "og:title", content: "Terms of Service · Spend Manager" },
      { property: "og:description", content: "The rules for using Spend Manager." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="24 September 2026">
      <p>By using Spend Manager you agree to these terms.</p>
      <h2>What Spend Manager is</h2>
      <p>Spend Manager is an expense tracking and spending analysis application. It is not a bank, payment processor, investment platform, financial institution or professional financial adviser. It cannot move, hold or invest money.</p>
      <h2>AI-generated information</h2>
      <p>Category suggestions, assistant answers and estimates are provided for general information only. They may be inaccurate and are not professional financial, tax or legal advice. Check important decisions with a qualified professional.</p>
      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in details private. You are responsible for activity on your account.</li>
        <li>Only enter data you are allowed to enter. Do not enter UPI PINs, card CVVs or bank passwords.</li>
        <li>You can delete your account at any time from Settings.</li>
      </ul>
      <h2>Acceptable use</h2>
      <p>Don't misuse the service, attempt to access other users' data, or overload the AI features.</p>
      <h2>Availability</h2>
      <p>We aim to keep the service running but cannot guarantee it will always be available or error-free. The service is provided "as is".</p>
      <h2>Changes</h2>
      <p>We may update these terms. Continued use after changes means you accept them.</p>
      <h2>Contact</h2>
      <p><a className="underline" href="mailto:support@spendmanager.app">support@spendmanager.app</a></p>
    </LegalPage>
  );
}
