import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[var(--accent)] hover:underline text-sm mb-8 inline-block">
          &larr; Back to Maia
        </Link>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-sm space-y-6 text-[var(--muted)]">
          <p className="text-sm">Last updated: January 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide directly (account details, organization information)
              and information generated through your use of the Service (usage data, device information).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Medical Data</h2>
            <p>
              Medical imaging data is processed locally on your device whenever possible.
              When server-side processing is required, data is encrypted in transit and at rest,
              and is not retained beyond the processing session unless explicitly saved by you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and improve the Service</li>
              <li>Manage your account and organization</li>
              <li>Process billing and credit transactions</li>
              <li>Communicate service updates and security notices</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Data Sharing</h2>
            <p>
              We do not sell personal information. We may share data with service providers
              who assist in operating the platform, subject to confidentiality agreements.
              We will disclose information when required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption,
              access controls, and regular security audits. All API communications use TLS 1.2+.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Data Retention</h2>
            <p>
              Account data is retained while your account is active. Conversation data
              may be deleted at your request. Usage logs are retained for 90 days
              for operational purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have rights to access, correct, delete,
              or export your personal data. Contact us to exercise these rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Regulatory Compliance</h2>
            <p>
              We comply with applicable healthcare data regulations including HIPAA (where applicable),
              GDPR, and local data protection laws. Organization administrators can configure
              data residency preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Contact</h2>
            <p>
              For privacy inquiries, contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@maia.health" className="text-[var(--accent)] hover:underline">privacy@maia.health</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
