'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="space-y-12">
          <section>
            <h1 className="text-4xl font-bold mb-4">About TokTik</h1>
            <p className="text-lg text-muted-foreground">
              TokTik is an AI-powered platform designed to help creators manage, generate, and publish content across multiple social media platforms effortlessly.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-4">
              To empower creators and businesses by eliminating the complexity of multi-platform content management. We believe that great content shouldn't be limited to one platform, and creators shouldn't have to spend hours manually adapting their work.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6">Why TokTik?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold mb-2">⚡ Time Savings</h3>
                <p className="text-muted-foreground">
                  Generate scripts, captions, and hashtags in seconds instead of hours. Publish to 6 platforms at once.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold mb-2">🤖 AI-Powered</h3>
                <p className="text-muted-foreground">
                  Claude AI learns your niche and audience, generating content tailored specifically for your brand.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold mb-2">📊 Data-Driven</h3>
                <p className="text-muted-foreground">
                  Real-time analytics across all platforms. Understand what works and optimize your strategy.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold mb-2">🔒 Secure</h3>
                <p className="text-muted-foreground">
                  Bank-level encryption, row-level security, and secure OAuth connections. Your data is protected.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <p className="text-lg text-muted-foreground mb-4">
              TokTik was born from the frustration of managing multiple social media accounts. Our founder realized that creators were spending more time managing platforms than actually creating content. We set out to change that.
            </p>
            <p className="text-lg text-muted-foreground mb-4">
              Today, TokTik is used by 2,500+ creators, helping them manage over 500K+ pieces of content with a combined 50M+ engagement.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6">Supported Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn'].map((platform) => (
                <div key={platform} className="bg-card rounded-lg border border-border p-4 text-center">
                  <p className="font-semibold">{platform}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-lg border border-border p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground">Join thousands of creators using TokTik to grow their audiences.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">Contact Us</Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
