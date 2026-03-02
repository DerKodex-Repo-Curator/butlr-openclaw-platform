'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, ChevronDown, ChevronUp, Send, Mail, ExternalLink, CheckCircle, Bot, Zap, CreditCard, Bug, Lightbulb, User, Headphones, Clock, Inbox } from 'lucide-react';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { support } from '@/lib/api';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: MessageSquare },
  { id: 'technical', label: 'Technical', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'bug', label: 'Bug Report', icon: Bug },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb },
  { id: 'account', label: 'Account', icon: User },
];

const faqs = [
  {
    question: 'How do I add my bot to a Telegram group?',
    answer:
      'Simply add your bot to any Telegram group by searching for its username. Once added, the bot will automatically start responding to commands and messages based on your configuration.',
  },
  {
    question: 'What commands does my bot support?',
    answer:
      'Your bot supports various commands including /start, /help, /settings, and custom commands you\'ve configured. You can view and manage all commands in the Settings section of your dashboard.',
  },
  {
    question: 'How is API usage calculated?',
    answer:
      'Each message your bot processes counts as one API call. This includes incoming messages, command executions, and automated responses. You can monitor your usage in the Usage Statistics section.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer:
      'Yes! You can change your plan at any time from the Billing section. Upgrades take effect immediately, and downgrades will apply at the start of your next billing cycle.',
  },
  {
    question: 'What happens if my bot goes offline?',
    answer:
      'We monitor all bots 24/7 and automatically restart them if they go offline. You can also manually restart your bot from the dashboard. If issues persist, our support team will investigate.',
  },
  {
    question: 'How do I use my own API key (BYOK)?',
    answer:
      'On the BYOK plan, you provide your own API key from Anthropic or OpenAI. Go to Settings to update your key. Your key is stored securely on your dedicated VM and never leaves your server.',
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formData, setFormData] = useState({ subject: '', message: '', email: '', category: 'general' });
  const [tickets, setTickets] = useState<Array<{id: number; category: string; subject: string; message: string; status: string; source: string; created_at: string}>>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://butlr.cloud/api';

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const token = localStorage.getItem('butlr_token');
      const res = await fetch(`${API_BASE}/support/tickets/me`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message) return;

    setSending(true);

    const ticketMessage = formData.subject
      ? `[${formData.subject}] ${formData.message}`
      : formData.message;

    const response = await support.submitTicket({
      subject: formData.subject,
      message: ticketMessage,
      email: formData.email,
      category: formData.category,
    });

    setSent(true);
    setFormData({ subject: '', message: '', email: '', category: 'general' });
    setSending(false);
    // Refresh ticket history
    fetchTickets();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Support</h1>
        <p className="text-gray-500 text-sm">
          Get help via Telegram, dashboard, or email
        </p>
      </div>

      {/* How Support Works */}
      <div className="bg-gradient-to-br from-[#111827] to-[#0f1629] border border-[#f43f5e]/20 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/20 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-[#f43f5e]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">How to Get Support</h2>
            <p className="text-xs text-gray-400">Three ways to reach us</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Telegram */}
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Via Telegram</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded-full">Fastest</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Just send a message to your bot with:
            </p>
            <div className="bg-[#1a1f2e] rounded-lg p-2.5 mb-2">
              <code className="text-[#f43f5e] text-sm font-mono">/support your message here</code>
            </div>
            <p className="text-[11px] text-gray-500">
              Your message goes directly to our support team. We'll reply through your bot!
            </p>
          </div>

          {/* Option 2: Dashboard */}
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Via Dashboard</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">You're here</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Use the form below to submit a detailed ticket with category selection.
            </p>
            <p className="text-[11px] text-gray-500">
              Best for detailed issues, billing questions, or feature requests.
            </p>
          </div>

          {/* Option 3: Email */}
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-white">Via Email</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Send us an email anytime:
            </p>
            <a href="mailto:support@butlr.cloud" className="text-[#f43f5e] text-sm hover:underline font-mono">
              support@butlr.cloud
            </a>
            <p className="text-[11px] text-gray-500 mt-2">
              We respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Form */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
              <Send className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Submit a Ticket</h2>
              <p className="text-xs text-gray-500">We'll respond as soon as possible</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Ticket Submitted!</h3>
              <p className="text-gray-500 text-sm mb-3">
                Our team has been notified and will get back to you shortly.
              </p>
              <button onClick={() => setSent(false)} className="text-[#f43f5e] hover:underline text-sm">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-1.5 ${
                        formData.category === cat.id
                          ? 'border-[#f43f5e] bg-[#f43f5e]/10 text-white'
                          : 'border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
  
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f43f5e]/50 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending || !formData.message}
                className="w-full px-4 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {sending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                Submit Ticket
              </button>
            </form>
          )}
        </div>

        {/* FAQ Section */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">FAQ</h2>
              <p className="text-xs text-gray-500">Quick answers</p>
            </div>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm text-white">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-3 pb-3 text-gray-500 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket History */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <Inbox className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Your Tickets</h2>
            <p className="text-xs text-gray-500">Recent support requests</p>
          </div>
        </div>

        {ticketsLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <LoadingSpinner size="sm" />
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No tickets yet. We're here when you need us.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const catLabel = CATEGORIES.find(c => c.id === ticket.category)?.label || 'General';
              return (
                <div key={ticket.id} className="border border-gray-800 rounded-lg p-3 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        
                        <span className="text-sm text-white font-medium truncate">
                          {ticket.subject || ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                          ticket.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{ticket.message}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-600 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
