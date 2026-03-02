'use client';

function ClientPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="heading-premium text-4xl sm:text-5xl font-bold text-white mb-3">Legal Notice (Imprint)</h1>
        <p className="text-xs font-mono uppercase tracking-wider text-gray-600 mb-10">Last updated: February 21, 2026</p>

        <div className="prose prose-invert prose-rose max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Service Provider</h2>
            <p className="text-gray-300 leading-relaxed">
              Lenny David Enderle<br />
              Rua Padre Manuel Bernardes 16, 5 Esq.<br />
              Costa da Caparica 2825-359<br />
              Portugal
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              Email: <a href="mailto:contact@butlr.cloud" className="text-[#f43f5e] hover:underline">contact@butlr.cloud</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Tax Information</h2>
            <p className="text-gray-300 leading-relaxed">
              NIF (Número de Identificação Fiscal): Upon request<br />
              {/* TODO: Add NIF when available — required for Portuguese commercial websites */}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Responsible for Content</h2>
            <p className="text-gray-300 leading-relaxed">
              Lenny David Enderle<br />
              Address as above
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">EU Online Dispute Resolution</h2>
            <p className="text-gray-300 leading-relaxed">
              The European Commission provides a platform for online dispute resolution (ODR):
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f43f5e] hover:underline ml-1"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="text-gray-300 leading-relaxed mt-2">
              Our email address can be found above in this legal notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Consumer Dispute Resolution</h2>
            <p className="text-gray-300 leading-relaxed">
              We are not willing or obliged to participate in dispute resolution proceedings before a
              consumer arbitration board.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Liability for Content</h2>
            <p className="text-gray-300 leading-relaxed">
              As a service provider, we are responsible for our own content on these pages in accordance with
              general laws. However, as a service provider, we are not obligated to monitor transmitted or
              stored third-party information or to investigate circumstances that indicate illegal activity.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Obligations to remove or block the use of information under general laws remain unaffected.
              However, liability in this regard is only possible from the time of knowledge of a specific
              infringement. Upon becoming aware of such violations, we will remove this content immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Liability for Links</h2>
            <p className="text-gray-300 leading-relaxed">
              Our website contains links to external third-party websites over whose content we have no influence.
              Therefore, we cannot accept any liability for this external content. The respective provider or
              operator of the linked pages is always responsible for their content.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              The linked pages were checked for possible legal violations at the time of linking. Illegal content
              was not recognizable at the time of linking. However, permanent monitoring of the content of the
              linked pages is not reasonable without concrete evidence of a violation. Upon becoming aware of
              legal violations, we will remove such links immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Copyright</h2>
            <p className="text-gray-300 leading-relaxed">
              The content and works created by the site operators on these pages are subject to copyright law.
              Duplication, processing, distribution, and any kind of exploitation outside the limits of copyright
              require the written consent of the respective author or creator. Downloads and copies of this site
              are only permitted for private, non-commercial use.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Insofar as the content on this site was not created by the operator, the copyrights of third parties
              are respected. In particular, third-party content is marked as such. Should you nevertheless become
              aware of a copyright infringement, please inform us accordingly. Upon becoming aware of legal
              violations, we will remove such content immediately.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
export default ClientPage;
