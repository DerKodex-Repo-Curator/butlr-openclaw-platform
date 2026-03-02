'use client';

import { useState } from 'react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import CheckoutModal from '@/components/checkout/CheckoutModal';
import SpaceBackground from '@/components/landing/SpaceBackground';

export default function LandingClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'byok' | null>(null);

  const handleStartTrial = () => {
    setSelectedTier('byok');
    setModalOpen(true);
  };

  const handleSelectPlan = (tier: string) => {
    setSelectedTier(tier as 'byok');
    setModalOpen(true);
  };

  return (
    <>
      {/* 🌌 Space Universe Background */}
      <SpaceBackground />

      {/* Animated Bot Cursor - shows the butler "working" across the page */}

      {/* Main Content */}
      <Hero onStartTrial={handleStartTrial} />
      <HowItWorks />
      <Features />
      <Pricing onSelectPlan={handleSelectPlan} />
      <Testimonials />
      <FAQ />
      <CTA onStartTrial={handleStartTrial} />

      <CheckoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedTier={selectedTier}
      />
    </>
  );
}
