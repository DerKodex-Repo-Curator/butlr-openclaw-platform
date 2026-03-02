'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'What can my butler actually do?',
    answer: 'Browse the web, create files, run code, take screenshots, fill forms, book appointments. It has its own computer with a real browser and file system. Think of it as a remote employee that never sleeps.',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer: 'ChatGPT tells you how. Your butler does it. It has a dedicated VM with browser, terminal, and tools. It can actually navigate websites, manage files, and complete tasks autonomously.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Each user gets their own isolated VM with ClawShield auto-hardening. Your data never mixes with others. SSH key-only access, firewall, fail2ban — enterprise-grade security on every instance.',
  },
  {
    question: 'What is BYOK?',
    answer: 'Bring Your Own Key. Connect your existing ChatGPT Plus or Claude Pro subscription, or use your own API keys. You pay us for infrastructure, your AI provider for intelligence. No double billing.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. No contracts, no hidden fees. Cancel from your dashboard and your butler stays active until the billing period ends.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-32">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#f43f5e] text-xs font-mono uppercase tracking-[0.2em] mb-4">FAQ</p>
          <h2 className="heading-premium text-4xl sm:text-5xl font-bold text-white">
            Questions?
          </h2>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="glass rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left group"
              >
                <span className="text-white font-medium text-sm pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <Minus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="mailto:support@butlr.cloud"
            className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            More questions? support@butlr.cloud
          </a>
        </div>
      </div>
    </section>
  );
}
