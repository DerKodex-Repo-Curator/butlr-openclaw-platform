'use client';

function ClientPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="heading-premium text-4xl sm:text-5xl font-bold text-white mb-3">Privacy Policy</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-gray-600 mb-10">Last updated: February 21, 2026</p>

        <div className="prose prose-invert prose-rose max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Butlr (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy and is committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, and protect information when you use our Service.
              By using Butlr, you consent to the data practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Data Controller</h2>
            <p className="text-gray-300 leading-relaxed">
              The data controller responsible for your personal data is:<br />
              Lenny David Enderle<br />
              Rua Padre Manuel Bernardes 16, 5 Esq.<br />
              Costa da Caparica 2825-359<br />
              Portugal<br /><br />
              Email: <a href="mailto:privacy@butlr.cloud" className="text-[#f43f5e] hover:underline">privacy@butlr.cloud</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Data We Collect</h2>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">3.1 Account Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Email address</li>
              <li>Name (as provided during setup)</li>
              <li>Payment information (processed and stored by Stripe — we do not store card details)</li>
              <li>Telegram user ID and chat ID (when connecting your bot)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">3.2 Service Data</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>AI assistant configuration and preferences (bot name, personality settings)</li>
              <li>Usage statistics (message counts, feature usage)</li>
              <li>Technical logs for troubleshooting (server logs, error reports)</li>
              <li>Installed skills and integration preferences</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">3.3 Conversation Data</h3>
            <div className="text-gray-300 leading-relaxed p-4 bg-white/[0.03] border-l-2 border-[#f43f5e]/50 rounded">
              <strong>Important:</strong> Your AI assistant runs on a <strong>dedicated virtual machine</strong> assigned
              exclusively to your account. Conversation context, memory files, and session data are stored locally on
              your VM to enable continuity and personalization. <strong>We do not centrally collect, read, or analyze
              your conversation content.</strong> When your subscription ends, your VM and all data on it are permanently
              deleted within 30 days.
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">3.4 API Keys and Credentials (BYOK Users)</h3>
            <p className="text-gray-300 leading-relaxed">
              If you provide your own API key, it is stored on your dedicated VM instance in an access-restricted
              configuration file. Your API key is used exclusively to authenticate requests to your chosen AI provider.
              We do not have access to, log, or transmit your decrypted API key outside your VM.
            </p>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">3.5 OAuth Tokens</h3>
            <p className="text-gray-300 leading-relaxed">
              If you connect your AI provider account via OAuth (e.g. OpenAI), the resulting access and refresh tokens
              are stored exclusively on your dedicated VM. We do not store OAuth tokens on our central infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Legal Basis for Processing (GDPR Art. 6)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We process your data based on the following legal grounds:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing necessary to provide the Service you subscribed to</li>
              <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Fraud prevention, security monitoring, service improvement</li>
              <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Tax records, compliance with legal requests</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> Optional marketing communications (if applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. How We Use Your Data</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To provision and manage your dedicated VM</li>
              <li>To send service-related communications (e.g. status updates, security notices)</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To provide customer support</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We share data with the following third parties, solely as necessary to provide the Service:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Stripe (USA):</strong> Payment processing — subject to <a href="https://stripe.com/privacy" className="text-[#f43f5e] hover:underline" target="_blank" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a></li>
              <li><strong>Hetzner (Germany):</strong> Server hosting infrastructure — data stays in the EU</li>
              <li><strong>Telegram:</strong> Bot messaging functionality</li>
              <li><strong>Your chosen AI provider:</strong> AI model requests are sent from your VM directly to the provider you selected (e.g. Anthropic, OpenAI, Google). We are not a party to these requests.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do <strong>not</strong> sell your personal data. We may disclose data if required by law, court order,
              or to protect our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your data is primarily stored on servers located in the <strong>European Union (Germany)</strong>.
              Payment data processed by Stripe may be transferred to the USA under Stripe&apos;s Data Processing Agreement
              and EU Standard Contractual Clauses. We do not otherwise transfer your personal data outside the EU/EEA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Data Storage and Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Access-restricted configuration files for sensitive data (API keys, tokens)</li>
              <li>SSH key-based access controls for VM management</li>
              <li>Firewall protection and regular security updates</li>
              <li>Isolated server instances per customer (no shared environments)</li>
              <li>Automatic data deletion upon subscription cancellation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account data for as long as your account is active. Upon account deletion or subscription
              cancellation, we will delete your personal data and terminate your VM within <strong>30 days</strong>,
              except where retention is required by law (e.g. tax records may be retained for up to 10 years as
              required by Portuguese and EU tax law). Payment records processed by Stripe are subject to
              Stripe&apos;s own retention policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Your Rights (GDPR)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Under the General Data Protection Regulation (GDPR), you have the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Access (Art. 15):</strong> Request a copy of your personal data</li>
              <li><strong>Rectification (Art. 16):</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure (Art. 17):</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Restriction (Art. 18):</strong> Request limitation of processing</li>
              <li><strong>Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Objection (Art. 21):</strong> Object to processing based on legitimate interest</li>
              <li><strong>Withdraw consent (Art. 7):</strong> Withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@butlr.cloud" className="text-[#f43f5e] hover:underline">privacy@butlr.cloud</a>.
              We will respond within 30 days. You also have the right to lodge a complaint with the Portuguese data
              protection authority (CNPD — <a href="https://www.cnpd.pt" className="text-[#f43f5e] hover:underline" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>)
              or any other EU supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use <strong>essential cookies only</strong> for authentication and session management. These cookies
              are strictly necessary for the Service to function and do not require consent under EU ePrivacy regulations.
              We do not use tracking, analytics, or advertising cookies. No third-party cookies are set by our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect
              data from children. If you believe a child has provided us with personal data, please contact us
              and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes via
              email or through the Service at least 14 days before the changes take effect. Your continued use
              after the effective date constitutes acceptance. Previous versions are available upon request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For privacy-related questions or to exercise your rights:<br />
              Email: <a href="mailto:privacy@butlr.cloud" className="text-[#f43f5e] hover:underline">privacy@butlr.cloud</a><br /><br />
              Data Controller: Lenny David Enderle<br />
              Rua Padre Manuel Bernardes 16, 5 Esq.<br />
              Costa da Caparica 2825-359, Portugal
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
export default ClientPage;
