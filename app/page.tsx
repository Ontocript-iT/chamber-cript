'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Scale,
  ShieldCheck,
  Users,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Role-Based Access',
      description:
          'Assign roles like Junior Lawyer or Clerk with custom permissions for cases and SMS.',
      tag: 'Granular Permissions',
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Grade Security',
      description:
          '6-digit PIN verification, reCAPTCHA integration, and forced password resets for new staff.',
      tag: 'Multi-Layer Auth',
    },
    {
      icon: Briefcase,
      title: 'Case Management',
      description:
          'Keep all your legal documents, client details, and case logs securely in one place.',
      tag: 'Unified Chamber',
    },
  ];

  const highlights = [
    'Role-based access control',
    '6-digit PIN & reCAPTCHA login',
    'Case & client diary tracking',
    'Seamless staff onboarding',
  ];

  return (
      <div
          className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#141b22] text-[#232e39] dark:text-slate-100 transition-colors">
        {/* Navigation Bar */}
        <header
            className="sticky top-0 z-30 w-full bg-white/90 dark:bg-[#232e39]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div
                  className="w-10 h-10 rounded-xl bg-[#232e39] dark:bg-[#3e5063] text-white flex items-center justify-center shadow-sm group-hover:scale-[1.02] transition">
                <Scale size={20}/>
              </div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#232e39] dark:text-white">
              Chamber<span className="text-slate-500 dark:text-slate-300">Cript</span>
            </span>
            </Link>

            <nav className="flex items-center gap-2.5 sm:gap-3">
              <Link
                  href="/login"
                  className="px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition"
              >
                Sign In
              </Link>
              <Link
                  href="/register"
                  className="px-4 sm:px-5 py-2.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white text-sm font-bold rounded-xl transition shadow-sm"
              >
                Register Firm
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div
                  className="bg-white dark:bg-[#232e39] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700/60 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                <Scale
                    size={320}
                    className="hidden sm:block absolute -right-16 -bottom-16 text-[#232e39] dark:text-white opacity-[0.03] pointer-events-none"
                    aria-hidden="true"
                />

                <div className="relative z-10 max-w-3xl mx-auto text-center">
                  <div
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#182028] border border-slate-200 dark:border-slate-700/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-6">
                    <Lock size={13}/>
                    Chamber &amp; Practice Operations Platform
                  </div>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#232e39] dark:text-white leading-[1.08]">
                    Modern Management for{' '}
                    <span className="text-slate-500 dark:text-slate-300">
                    Top-Tier Law Firms
                  </span>
                  </h1>

                  <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
                    Streamline your legal practice with role-based access, secure PIN
                    authentication, case tracking, and seamless staff onboarding.
                  </p>

                  <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                    <Link
                        href="/register"
                        className="w-full sm:w-auto px-7 py-4 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white text-sm sm:text-base font-bold rounded-xl transition shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                    >
                      Start Your Firm
                      <Briefcase size={18}/>
                    </Link>

                    <Link
                        href="/login"
                        className="w-full sm:w-auto px-7 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-[#182028] dark:hover:bg-[#1e2832] text-[#232e39] dark:text-slate-100 border border-slate-300 dark:border-slate-600/80 text-sm sm:text-base font-bold rounded-xl transition flex items-center justify-center gap-2"
                    >
                      Staff Portal Login
                      <ArrowRight size={18}/>
                    </Link>
                  </div>

                  {/* Quick Capability Strip */}
                  <div
                      className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {highlights.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2
                          size={15}
                          className="text-[#232e39] dark:text-slate-200 shrink-0"
                      />
                          {item}
                    </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Highlights */}
          <section className="pb-20 sm:pb-24 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div
                  className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Core Capabilities
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight mt-1">
                    Built for Chambers That Value Structure &amp; Security
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map(({icon: Icon, title, description, tag}) => (
                    <div
                        key={title}
                        className="p-7 bg-white dark:bg-[#232e39] rounded-3xl shadow-lg border border-slate-200/90 dark:border-slate-700/60 flex flex-col justify-between hover:-translate-y-0.5 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div
                              className="w-12 h-12 rounded-2xl bg-[#232e39] dark:bg-[#3e5063] text-white flex items-center justify-center shadow-sm">
                            <Icon size={22}/>
                          </div>
                          <span
                              className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#182028] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                        {tag}
                      </span>
                        </div>

                        <h3 className="text-xl font-black text-[#232e39] dark:text-white mb-2.5 tracking-tight">
                          {title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {description}
                        </p>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer
            className="w-full py-6 px-4 bg-white dark:bg-[#232e39] border-t border-slate-200/80 dark:border-slate-700/60">
          <div
              className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>&copy; {currentYear} ChamberCript. All rights reserved.</span>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                  href="/privacy-policy"
                  className="hover:text-[#2A3642] dark:hover:text-white underline underline-offset-4 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Link
                  href="/terms-and-conditions"
                  className="hover:text-[#2A3642] dark:hover:text-white underline underline-offset-4 transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              <span className="hidden md:inline text-slate-300 dark:text-slate-600">|</span>
              <span className="hidden md:inline">Protected Chamber &amp; Practice Management</span>
            </div>
          </div>
        </footer>
      </div>
  );
}