'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Users, BarChart3, Lock, ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Content Generation',
      description: 'Scripts, titles, captions & hashtags crafted by Claude AI in seconds',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Zap,
      title: 'Multi-Platform Publishing',
      description: 'TikTok, YouTube, Instagram, Facebook, Twitter, LinkedIn — all from one dashboard',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track views, engagement, and performance metrics across all platforms instantly',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite team members, assign roles, and build together seamlessly',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Lightbulb,
      title: 'Smart Account Setup',
      description: 'AI-powered suggestions for usernames, display names, and content niches',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, OAuth security, and row-level data protection',
      color: 'from-indigo-500 to-purple-500',
    },
  ];

  const pricing = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for testing',
      features: [
        '20 AI generations/month',
        '1 social account',
        'Basic analytics',
        'Email support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Creator',
      price: '$29',
      period: '/month',
      description: 'For content creators',
      features: [
        '200 AI generations/month',
        '5 social accounts',
        'Advanced analytics',
        'Priority support',
        'Team collaboration',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Agency',
      price: '$99',
      period: '/month',
      description: 'For agencies & teams',
      features: [
        '1000 AI generations/month',
        'Unlimited accounts',
        'Full analytics suite',
        '24/7 priority support',
        'Team management',
        'API access',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const stats = [
    { label: 'Creators Using TokTik', value: '2,500+' },
    { label: 'Posts Generated', value: '500K+' },
    { label: 'Total Engagement', value: '50M+' },
    { label: 'Platforms Supported', value: '6' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">TokTik</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-40">
        <div className="text-center space-y-8">
          <div className="inline-block bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 px-6 py-2 rounded-full hover:border-blue-500/40 transition-colors">
            <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">✨ AI-Powered Social Media Management</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            Create content for <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">all your audiences</span> in seconds
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Stop juggling multiple platforms. TokTik's AI generates perfect content for TikTok, YouTube, Instagram, Facebook, Twitter, and LinkedIn—then publishes everywhere at once.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg px-8 py-6 rounded-lg">
                Start Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-lg border-2">
                See How It Works
              </Button>
            </Link>
          </div>

          <p className="text-base text-muted-foreground pt-2">
            No credit card. No commitments. Free tier includes 20 AI-powered generations.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mt-20 rounded-2xl border-2 border-border overflow-hidden shadow-2xl bg-gradient-to-br from-blue-500/5 via-background to-cyan-500/5">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-12 h-96 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
            </div>
            <div className="text-center text-muted-foreground relative z-10">
              <div className="inline-block p-4 bg-white/5 rounded-lg mb-4">
                <Sparkles className="h-16 w-16 mx-auto text-blue-400" />
              </div>
              <p className="text-lg font-medium">Dashboard Preview</p>
              <p className="text-sm mt-2 text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-lg bg-card border border-border/50 hover:border-blue-500/30 transition-colors">
              <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-3">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold">Everything creators need</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed to help you create more, manage better, and grow faster across all platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="group bg-card rounded-xl border border-border p-7 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className={`inline-block p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold">How it works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Get from zero to published across 6 platforms in just 4 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
          {[
            { step: '1', title: 'Connect Accounts', desc: 'Link your TikTok, YouTube, Instagram, Facebook, Twitter & LinkedIn with one click' },
            { step: '2', title: 'Create Content', desc: 'Write your ideas or use AI to generate scripts, titles, and captions instantly' },
            { step: '3', title: 'Customize', desc: 'Tailor content for each platform with platform-specific optimizations' },
            { step: '4', title: 'Publish & Track', desc: 'Schedule posts for optimal times and track real-time performance metrics' },
          ].map((item, idx) => (
            <div key={item.step} className="relative">
              <div className="flex flex-col h-full">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl mb-6 flex-shrink-0">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed flex-grow">{item.desc}</p>
              </div>
              {idx < 3 && (
                <div className="hidden md:block absolute top-7 left-full w-6 text-muted-foreground/50 text-2xl font-light">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold">Pricing that grows with you</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start free, upgrade when you're ready. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border-2 p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-blue-500 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 shadow-xl transform md:scale-105 ring-1 ring-blue-500/20'
                  : 'border-border bg-card hover:border-blue-500/50 hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1 rounded-full text-xs font-semibold text-white mb-4">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="text-5xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>

              <Link href={plan.name === 'Agency' ? '/contact' : '/signup'} className="block mb-8">
                <Button
                  className="w-full rounded-lg py-6 text-base font-semibold"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`h-5 w-5 shrink-0 mt-0.5 ${plan.highlighted ? 'text-blue-600' : 'text-primary'}`} />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-gradient-to-br from-blue-600/10 via-cyan-600/5 to-blue-600/10 rounded-2xl border-2 border-blue-500/30 p-12 sm:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Ready to create at scale?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join 2,500+ creators already using TokTik to go viral across all platforms. Start free, upgrade anytime.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg px-8 py-6 rounded-lg">
                Start Free Now
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-lg border-2">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">TokTik</h4>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI-powered social media management for creators. Generate content once, post everywhere.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <div>
                <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="/#features" className="hover:text-foreground transition-colors">Features</a></li>
                  <li><a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                  <li><a href="/contact" className="hover:text-foreground transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-sm">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a></li>
                  <li><a href="/terms" className="hover:text-foreground transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 TokTik. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
