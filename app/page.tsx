'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Users, BarChart3, Lock, ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Content Generation',
      description: 'Generate scripts, titles, captions, and hashtags in seconds using Claude AI',
    },
    {
      icon: Zap,
      title: 'Multi-Platform Publishing',
      description: 'Post to TikTok, YouTube, Instagram, Facebook, Twitter, and LinkedIn from one place',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track views, likes, comments, and engagement across all your accounts',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite team members, assign roles, and collaborate on content',
    },
    {
      icon: Lightbulb,
      title: 'Smart Suggestions',
      description: 'AI suggests the perfect username, display name, and niche for new accounts',
    },
    {
      icon: Lock,
      title: 'Bank-Level Security',
      description: 'Encrypted credentials, row-level security, and secure OAuth connections',
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center space-y-6">
          <div className="inline-block bg-primary/10 px-4 py-2 rounded-full">
            <span className="text-sm font-semibold text-primary">✨ AI-Powered Social Media Management</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Create content for all your social accounts in seconds
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop juggling multiple platforms. TokTik generates scripts, captions, and handles posting across
            TikTok, YouTube, Instagram, Facebook, Twitter, and LinkedIn — all powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required. Start generating content in 2 minutes.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mt-16 rounded-2xl border border-border overflow-hidden shadow-2xl bg-muted/50">
          <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 p-12 h-96 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Product screenshot coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to go viral</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built by creators, for creators. All the tools you need to scale your social media presence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
                <Icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Connect Accounts', desc: 'Link your TikTok, YouTube, Instagram & more' },
            { step: '2', title: 'Create or Generate', desc: 'Write content or let AI generate it for you' },
            { step: '3', title: 'Customize', desc: 'Tailor content for each platform & audience' },
            { step: '4', title: 'Publish & Analyze', desc: 'Schedule posts and track real-time analytics' },
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground">Start free. Scale as you grow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border-2 p-8 transition-all ${
                plan.highlighted
                  ? 'border-primary bg-primary/5 shadow-lg scale-105'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
              </div>

              <Button className="w-full mb-8" variant={plan.highlighted ? 'default' : 'outline'}>
                {plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl border border-primary/20 p-12 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to scale your content?</h2>
          <p className="text-lg text-muted-foreground">
            Join 2,500+ creators who are already using TokTik to grow their audiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Button size="lg" variant="outline">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground">Discord</a></li>
                <li><a href="#" className="hover:text-foreground">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>&copy; 2026 TokTik. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-foreground">Status</a>
              <a href="#" className="hover:text-foreground">API Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
