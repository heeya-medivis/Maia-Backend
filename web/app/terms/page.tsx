import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[var(--accent)] hover:underline text-sm mb-8 inline-block">
          &larr; Back to Maia
        </Link>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-invert prose-sm space-y-6 text-[var(--muted)]">
          <p className="text-sm">Last updated: January 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Maia platform (&quot;Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Description of Service</h2>
            <p>
              Maia is a medical imaging AI assistant platform that provides AI-powered analysis,
              segmentation, and visualization tools for healthcare professionals.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Medical Disclaimer</h2>
            <p>
              Maia is intended as a decision-support tool only. It does not replace professional
              medical judgment. All outputs should be reviewed and validated by qualified healthcare
              professionals before clinical use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities under your account. Notify us immediately of any unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Data &amp; Privacy</h2>
            <p>
              Your use of the Service is subject to our <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
              All patient data is processed in accordance with applicable healthcare regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Credits &amp; Billing</h2>
            <p>
              Certain features consume credits. Credits are non-refundable once consumed.
              Pricing and credit packages are subject to change with notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Maia shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:legal@maia.health" className="text-[var(--accent)] hover:underline">legal@maia.health</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
