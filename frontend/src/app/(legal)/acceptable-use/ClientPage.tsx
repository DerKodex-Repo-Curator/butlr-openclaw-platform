'use client';

function ClientPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="heading-premium text-4xl sm:text-5xl font-bold text-white mb-3">Acceptable Use Policy</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-gray-600 mb-10">Last updated: February 21, 2026</p>

        <div className="prose prose-invert prose-rose max-w-none space-y-8">

          <section>
            <p className="text-gray-300 leading-relaxed text-lg">
              This Acceptable Use Policy (&quot;AUP&quot;) describes prohibited uses of Butlr. Violations may result in
              immediate suspension or termination of your account without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Fair Use</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Butlr is designed for personal productivity use. Fair use includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Reasonable personal use of your AI assistant</li>
              <li>Typical conversation patterns and response times</li>
              <li>Use by the account holder only (no sharing or reselling)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We reserve the right to limit usage that significantly exceeds normal patterns or impacts service quality
              for other users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-red-500 mb-4">Prohibited Activities</h2>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">Illegal Activities</h3>
            <div className="bg-red-500/[0.05] border border-red-500/10 p-4 rounded">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Any activity that violates local, national, or international law</li>
                <li>Drug trafficking or substance-related offenses</li>
                <li>Money laundering or financial crimes</li>
                <li>Terrorism or extremist activities</li>
                <li>Human trafficking or exploitation</li>
                <li>Copyright infringement or piracy</li>
                <li>Identity theft or document fraud</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">Harmful Content</h3>
            <div className="bg-red-500/[0.05] border border-red-500/10 p-4 rounded">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Content that promotes violence, self-harm, or suicide</li>
                <li>Hate speech or discrimination based on protected characteristics</li>
                <li>Harassment, bullying, or threats against individuals</li>
                <li>Sexually explicit content involving minors (CSAM)</li>
                <li>Non-consensual intimate content</li>
                <li>Graphic violence or gore</li>
                <li>Disinformation campaigns or coordinated inauthentic behavior</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">Security Violations</h3>
            <div className="bg-red-500/[0.05] border border-red-500/10 p-4 rounded">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Attempting to circumvent AI safety measures or content filters</li>
                <li>Jailbreaking or prompt injection attacks</li>
                <li>Creating malware, viruses, or exploit code intended for malicious use</li>
                <li>Phishing, social engineering, or scam operations</li>
                <li>Unauthorized access to systems or data</li>
                <li>DDoS attacks or service disruption</li>
                <li>Reverse engineering or extracting model weights</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">Spam and Abuse</h3>
            <div className="bg-red-500/[0.05] border border-red-500/10 p-4 rounded">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Automated or bulk messaging</li>
                <li>Spam generation or distribution</li>
                <li>Fake reviews or astroturfing</li>
                <li>Scraping or data harvesting at scale</li>
                <li>Creating multiple accounts to evade limits</li>
                <li>Sharing account access with unauthorized users</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">Fraud and Deception</h3>
            <div className="bg-red-500/[0.05] border border-red-500/10 p-4 rounded">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Impersonating individuals, companies, or officials</li>
                <li>Creating deceptive AI-generated content without disclosure</li>
                <li>Financial scams or investment fraud</li>
                <li>Fake testimonials or endorsements</li>
                <li>Pyramid schemes or multi-level marketing abuse</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-gray-200 mt-6 mb-3">High-Risk Uses</h3>
            <div className="bg-amber-500/[0.05] border border-amber-500/10 p-4 rounded">
              <p className="text-gray-300 mb-2">Butlr is not designed for and should not be relied upon for:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Medical diagnosis or treatment decisions</li>
                <li>Legal advice or representation</li>
                <li>Financial or investment advice</li>
                <li>Safety-critical systems or infrastructure</li>
                <li>Autonomous weapons or military applications</li>
                <li>Automated decisions affecting fundamental rights</li>
              </ul>
              <p className="text-gray-300 mt-3 text-sm">
                While your AI assistant can help with research, writing, coding, and many other tasks, all output
                is provided &quot;as is&quot; and should be independently reviewed before use in any consequential context.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Monitoring and Enforcement</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              While we do not actively monitor conversation content, we may:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Monitor usage patterns for abuse detection (e.g. excessive resource consumption)</li>
              <li>Investigate reports of policy violations</li>
              <li>Review accounts flagged by automated systems</li>
              <li>Cooperate with law enforcement when legally required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Consequences of Violations</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Violations of this policy may result in:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Warning:</strong> For minor or first-time violations</li>
              <li><strong>Temporary Suspension:</strong> Account access restricted pending review</li>
              <li><strong>Permanent Termination:</strong> Account deleted without refund</li>
              <li><strong>Legal Action:</strong> Reporting to law enforcement if required</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Serious violations (illegal activity, CSAM, terrorism) result in immediate permanent termination
              and may be reported to authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Reporting Violations</h2>
            <p className="text-gray-300 leading-relaxed">
              To report a violation of this policy, contact:<br />
              <a href="mailto:abuse@butlr.cloud" className="text-[#f43f5e] hover:underline">abuse@butlr.cloud</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this policy to address new risks or reflect changes in law. Material changes will be
              communicated to users at least 14 days in advance. Continued use after changes constitutes acceptance.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
export default ClientPage;
