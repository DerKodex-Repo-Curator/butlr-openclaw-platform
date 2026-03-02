'use client';

import Link from 'next/link';

function ClientPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="heading-premium text-4xl sm:text-5xl font-bold text-white mb-3">Terms of Service</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-gray-600 mb-10">Last updated: February 21, 2026</p>

        <div className="prose prose-invert prose-rose max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using Butlr (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
              If you disagree with any part of these terms, you do not have permission to access the Service.
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Butlr provides a <strong>platform infrastructure</strong> that enables users to deploy and interact with
              AI-powered personal assistants via Telegram. The Service includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>A dedicated virtual machine (VM) hosting your AI assistant instance</li>
              <li>Telegram bot integration and connectivity</li>
              <li>User dashboard for configuration and monitoring</li>
              <li>Optional skill marketplace integrations (e.g. web search, productivity tools, developer tools)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Important:</strong> Butlr is a platform provider only. We do not control, monitor, or take responsibility
              for the content of conversations between users and their AI assistants, nor for any actions users take based
              on AI responses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Intended Use</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Butlr AI assistants are designed for <strong>personal productivity and assistance tasks</strong>, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Research and information gathering</li>
              <li>Writing assistance and content creation</li>
              <li>Task management and reminders</li>
              <li>Learning and educational support</li>
              <li>General question answering</li>
              <li>Web browsing and file management</li>
              <li>Software development assistance and automation</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4 p-4 bg-white/[0.03] border-l-2 border-[#f43f5e]/50 rounded">
              <strong>No Warranty on Output:</strong> All AI-generated output — including but not limited to text, code,
              research summaries, and recommendations — is provided <strong>&quot;as is&quot; without any warranty</strong>.
              You are solely responsible for reviewing, testing, and validating any output before use. Code generated
              by the AI assistant should be independently reviewed before deployment to production environments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. User Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              As a user of Butlr, you are <strong>solely responsible</strong> for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>All content you input into or generate through the Service</li>
              <li>All actions you take based on AI assistant responses</li>
              <li>Ensuring your use complies with all applicable laws and regulations</li>
              <li>Maintaining the security of your account credentials</li>
              <li>Any consequences arising from sharing your AI assistant access with third parties</li>
              <li>Verifying the accuracy of any information provided by the AI assistant</li>
              <li>Any API keys or credentials you provide to the Service (BYOK model)</li>
              <li>Compliance with the terms of your chosen AI provider (e.g. Anthropic, OpenAI, Google)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You acknowledge that AI systems can make mistakes, produce inaccurate information, or generate inappropriate
              content despite safeguards. You agree to use the Service with appropriate judgment and not rely solely on
              AI responses for critical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Prohibited Uses</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree <strong>not</strong> to use the Service for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Any illegal activities or to facilitate illegal activities</li>
              <li>Harassment, abuse, threats, or intimidation of any person</li>
              <li>Generating spam, phishing content, or malicious communications</li>
              <li>Creating content that promotes violence, hatred, or discrimination</li>
              <li>Generating sexually explicit or exploitative content</li>
              <li>Impersonating other individuals or entities</li>
              <li>Attempting to circumvent AI safety measures or content filters</li>
              <li>Automated or bulk message sending without authorization</li>
              <li>Reverse engineering, decompiling, or attempting to extract source code</li>
              <li>Interfering with or disrupting the Service or servers</li>
              <li>Violating any third-party rights, including intellectual property rights</li>
              <li>Any activity that could harm minors</li>
              <li>Generating malware, exploits, or security vulnerabilities</li>
              <li>Financial fraud, scams, or deceptive practices</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              See our <Link href="/acceptable-use" className="text-[#f43f5e] hover:underline">Acceptable Use Policy</Link> for
              detailed guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Account Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We reserve the right to <strong>suspend or terminate</strong> your account immediately, without prior notice or liability, for any reason, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Violation of these Terms or the Acceptable Use Policy</li>
              <li>Suspected illegal activity or fraud</li>
              <li>Abuse of the Service or other users</li>
              <li>Non-payment of fees</li>
              <li>At our sole discretion for any reason</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Upon termination, your right to use the Service will immediately cease. We may delete your data and
              AI assistant instance without obligation to retain or provide copies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Fees, Payment, and Right of Withdrawal</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Subscription fees are billed in advance on a monthly basis. We reserve the right to change pricing
              with 30 days notice. Failure to pay may result in service suspension. You are responsible for any
              taxes applicable to your subscription.
            </p>
            <div className="text-gray-300 leading-relaxed p-4 bg-white/[0.03] border-l-2 border-[#f43f5e]/50 rounded">
              <strong>Right of Withdrawal (EU):</strong> As a consumer in the EU, you have a 14-day right of withdrawal
              from the date of subscription. However, by starting to use the Service (including VM provisioning and
              AI assistant setup), you expressly consent to the immediate performance of the contract and acknowledge
              that you lose your right of withdrawal once the Service has been fully provided. If you withdraw before
              the Service is fully provided, you may be charged a proportional amount for the services already rendered.
            </div>
            <p className="text-gray-300 leading-relaxed mt-4">
              Refund requests outside the withdrawal period are handled on a case-by-case basis. Contact
              {' '}<a href="mailto:billing@butlr.cloud" className="text-[#f43f5e] hover:underline">billing@butlr.cloud</a> for
              billing inquiries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service integrates with third-party services including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Telegram</strong> — for bot messaging and interaction</li>
              <li><strong>AI model providers</strong> as selected by you (e.g. Anthropic, OpenAI, Google) — for AI processing</li>
              <li><strong>Stripe</strong> — for payment processing</li>
              <li><strong>Hetzner</strong> — for server infrastructure</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Your use of these services is subject to their respective terms of service. We are not responsible for
              the availability, accuracy, or content of third-party services. As a BYOK (Bring Your Own Key) user,
              you are responsible for compliance with your chosen AI provider&apos;s terms of service and usage policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service and its original content (excluding content provided by users) remain the exclusive property
              of Butlr and its licensors. You retain ownership of content you input. By using the Service, you grant
              us a limited license to process your content solely for providing the Service. AI-generated outputs may
              be subject to limitations on ownership and commercial use as determined by the respective AI provider&apos;s terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Disclaimer of Warranties</h2>
            <div className="text-gray-300 leading-relaxed p-4 bg-white/[0.03] border border-white/[0.06] rounded">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, AND ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
              ERROR-FREE. AI RESPONSES MAY CONTAIN ERRORS, INACCURACIES, OR INAPPROPRIATE CONTENT. YOU USE THE SERVICE
              AT YOUR OWN RISK.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Limitation of Liability</h2>
            <div className="text-gray-300 leading-relaxed p-4 bg-white/[0.03] border border-white/[0.06] rounded">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUTLR AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND
              AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM OR RELATED TO YOUR
              USE OF THE SERVICE, REGARDLESS OF WHETHER WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR
              TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Butlr and its affiliates from any claims, damages,
              losses, liabilities, and expenses (including legal fees) arising from: (a) your use of the Service;
              (b) your violation of these Terms; (c) your violation of any third-party rights; (d) any content you
              submit or generate through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by the laws of Portugal. Any disputes shall be resolved exclusively in
              the courts of Portugal. If any provision of these Terms is found unenforceable, the remaining provisions
              will continue in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via
              email or through the Service. Your continued use after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these Terms, please contact us at:<br />
              <a href="mailto:legal@butlr.cloud" className="text-[#f43f5e] hover:underline">legal@butlr.cloud</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
export default ClientPage;
