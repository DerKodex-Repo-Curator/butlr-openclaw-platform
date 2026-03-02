'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0a0f1a] border-t border-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Tagline */}
          <div className="text-center md:text-left">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <span className="text-2xl">🦞</span>
              <span className="text-xl font-bold text-white">Butlr</span>
            </Link>
            <p className="text-gray-500 text-sm">
              AI that does things.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-gray-400 hover:text-white transition-colors">
              FAQ
            </a>
            <a href="mailto:support@butlr.cloud" className="text-gray-400 hover:text-white transition-colors">
              Support
            </a>
          </div>

          {/* OpenClaw */}
          <a
            href="https://openclaw.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-500 hover:text-[#fb7185] transition-colors text-sm"
          >
            <span>🦞</span>
            <span>Built on OpenClaw</span>
          </a>
        </div>

        {/* Legal Links */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Butlr</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/acceptable-use" className="hover:text-white transition-colors">Acceptable Use</Link>
            <Link href="/imprint" className="hover:text-white transition-colors">Imprint</Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs max-w-2xl mx-auto">
            Butlr provides AI assistant infrastructure. All AI output is provided &quot;as is&quot; — users are responsible
            for reviewing and validating any output. Not intended for medical, legal, or financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
