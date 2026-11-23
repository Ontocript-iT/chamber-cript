import type { Metadata } from 'next';
import Link from 'next/link';
import {
    Scale,
    FileText,
    ShieldAlert,
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    MessageSquare,
    UserCheck,
    Server,
    AlertTriangle,
    Gavel,
} from 'lucide-react';

// Update these values with your official company details
const TERMS_CONFIG = {
    productName: 'ChamberCript',
    companyLegalName: 'Ontocript IT (Pvt) Ltd',
    effectiveDate: 'November 23, 2026',
    copyrightYear: '2026',
    trialDays: 14,
    gracePeriodDays: 30,
    noticeDays: 15,
    governingLaw: 'Democratic Socialist Republic of Sri Lanka',
    supportEmail: 'support@chambercript.com',
    contactPhone: '+94 77 000 0000',
    companyAddress: 'Kandy, Sri Lanka',
};

export const metadata: Metadata = {
    title: `Terms & Conditions | ${TERMS_CONFIG.productName}`,
    description: `Terms of Service and Subscriber Agreement for ${TERMS_CONFIG.productName} by ${TERMS_CONFIG.companyLegalName}.`,
};

const SECTIONS = [
    { id: 'section-1', number: '01', title: 'Acceptance of Terms' },
    { id: 'section-2', number: '02', title: 'Eligibility & Accounts' },
    { id: 'section-3', number: '03', title: 'Subscriptions & Trials' },
    { id: 'section-4', number: '04', title: 'SMS Credits & Messaging' },
    { id: 'section-5', number: '05', title: 'Data Ownership & Privacy' },
    { id: 'section-6', number: '06', title: 'Acceptable Use Policy' },
    { id: 'section-7', number: '07', title: 'Intellectual Property' },
    { id: 'section-8', number: '08', title: 'Service Availability' },
    { id: 'section-9', number: '09', title: 'Limitation of Liability' },
    { id: 'section-10', number: '10', title: 'Termination & Data Export' },
    { id: 'section-11', number: '11', title: 'Governing Law & Contact' },
];

export default function TermsAndConditionsPage() {
    const {
        productName,
        companyLegalName,
        effectiveDate,
        copyrightYear,
        trialDays,
        gracePeriodDays,
        noticeDays,
        governingLaw,
        supportEmail,
        contactPhone,
        companyAddress,
    } = TERMS_CONFIG;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#182028] text-[#2A3642] dark:text-slate-100 font-sans transition-colors duration-300">
            {/* ================= TOP BAR ================= */}
            <header className="bg-white dark:bg-[#2A3642] border-b border-slate-200/80 dark:border-[#465769]/40 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#2A3642] dark:bg-[#465769] text-white rounded-xl flex items-center justify-center shadow-xs">
                            <Scale size={18} />
                        </div>
                        <span className="text-lg font-extrabold tracking-widest text-[#2A3642] dark:text-white">
                            Chamber<span className="text-[#465769] dark:text-slate-300">Cript</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/privacy-policy"
                            className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-[#465769] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#354453] transition"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#465769]/60 bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#354453] transition"
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* ================= MAIN CONTENT ================= */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
                {/* Hero Header Card */}
                <div className="bg-gradient-to-br from-[#2A3642] via-[#354453] to-[#465769] text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-white/10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold uppercase tracking-widest text-slate-200 mb-4">
                        <FileText size={14} /> Subscriber Terms of Service
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Terms &amp; Conditions</h1>
                    <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                        <span>
                            <strong className="text-white">Platform :</strong> {productName}
                        </span>
                        <span>
                            <strong className="text-white">Service Provider:</strong> {companyLegalName}
                        </span>
                        <span>
                            <strong className="text-white">Effective Date:</strong> {effectiveDate}
                        </span>
                    </div>
                </div>

                {/* Important Legal Notice Banner */}
                <div className="bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <ShieldAlert size={19} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            Important Practice Management Notice
                        </h2>
                        <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90 font-medium">
                            <strong>{productName}</strong> is a digital chamber administration, case diary, and client
                            notification platform. It does not provide legal advice, and{' '}
                            <strong>
                                Attorneys-at-Law remain solely responsible for independently verifying court dates,
                                statutory limitation periods, and client filings.
                            </strong>
                        </p>
                    </div>
                </div>

                {/* Quick Navigation Grid */}
                <nav
                    aria-label="Terms and Conditions Sections"
                    className="bg-white dark:bg-[#2A3642] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-[#465769]/40 shadow-2xs"
                >
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-3">
                        Quick Navigation
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {SECTIONS.map((sec) => (
                            <a
                                key={sec.id}
                                href={`#${sec.id}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] hover:bg-[#2A3642] hover:text-white dark:hover:bg-[#465769] border border-slate-200/80 dark:border-[#465769]/40 text-xs font-bold transition"
                            >
                                <span className="text-[10px] font-black opacity-70">{sec.number}</span>
                                <span className="truncate">{sec.title}</span>
                            </a>
                        ))}
                    </div>
                </nav>

                {/* Terms Body Sections */}
                <div className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm divide-y divide-slate-200/80 dark:divide-[#465769]/40">
                    {/* 01. ACCEPTANCE OF TERMS */}
                    <section id="section-1" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                01
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Acceptance of Terms
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) form a legally binding agreement between{' '}
                            <strong>{companyLegalName}</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                            &ldquo;our&rdquo;) and the registering Attorney-at-Law, Law Firm, or Legal Chamber
                            (&ldquo;Subscriber,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) governing access to and
                            use of <strong>{productName}</strong> (the &ldquo;Platform&rdquo;). By creating an account,
                            approving staff access, or using the Platform, you agree to be bound by these Terms and our{' '}
                            <Link
                                href="/privacy-policy"
                                className="font-bold text-[#2A3642] dark:text-white underline hover:opacity-80"
                            >
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </section>

                    {/* 02. ELIGIBILITY & ACCOUNT RESPONSIBILITIES */}
                    <section id="section-2" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                02
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Eligibility &amp; Account Responsibilities
                                <UserCheck size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Authorized Legal Use:</strong> The
                                Platform is intended solely for practicing Attorneys-at-Law, Legal Chambers, and their
                                authorized personnel (such as Junior Counsel, Apprentices, and Legal Clerks).
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Credential &amp; PIN Security:</strong>{' '}
                                You are responsible for safeguarding your login password and security PIN. You must
                                notify us immediately if you suspect any unauthorized access to your Chamber account.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">
                                    Staff &amp; Role Administration:
                                </strong>{' '}
                                The Principal Lawyer (Chamber Administrator) is solely responsible for creating staff
                                sub-accounts, assigning granular access permissions, and promptly revoking access when
                                a staff member leaves the Chamber.
                            </li>
                        </ul>
                    </section>

                    {/* 03. SUBSCRIPTIONS, FREE TRIAL & BILLING */}
                    <section id="section-3" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                03
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Subscriptions, Free Trial &amp; Billing
                                <CreditCard size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Account Verification:</strong> New
                                Chamber registrations are subject to administrative verification prior to activation.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">
                                    {trialDays}-Day Free Trial:
                                </strong>{' '}
                                Eligible new Chambers receive a complimentary {trialDays}-day trial period. Upon trial
                                expiration, workspace access is automatically paused until an active subscription plan
                                is confirmed.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Subscription Payments:</strong>{' '}
                                Ongoing access requires timely settlement of applicable monthly or annual subscription
                                fees. Overdue accounts may be temporarily suspended until outstanding balances are
                                cleared.
                            </li>
                        </ul>
                    </section>

                    {/* 04. SMS CREDITS, QUOTAS & MESSAGING COMPLIANCE */}
                    <section id="section-4" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                04
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                SMS Credits, Quotas &amp; Messaging Compliance
                                <MessageSquare size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            {productName} provides integrated SMS notifications so Chambers can send case updates and
                            hearing reminders to clients:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Prepaid SMS Quotas:</strong> SMS
                                credits are purchased in bundled top-up packages and credited to your Chamber upon
                                payment verification. Each standard 160-character SMS segment deducts one (1) credit
                                from your balance.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Minimum Balance Threshold:</strong>{' '}
                                To prevent service interruptions during active court schedules, standard workspace
                                modules may be restricted when your SMS quota drops to or below 50 credits until a
                                top-up request is submitted.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Lawful Communication Only:</strong>{' '}
                                You agree to send SMS notifications strictly to consenting clients regarding legitimate
                                legal matters. Unsolicited bulk marketing, spam, or unlawful content is strictly
                                prohibited.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Carrier Delivery:</strong> SMS
                                delivery depends on third-party telecommunications networks. While failed dispatches are
                                logged for retry, we do not guarantee instantaneous mobile network delivery in areas
                                with poor reception or carrier outages.
                            </li>
                        </ul>
                    </section>

                    {/* 05. CHAMBER DATA OWNERSHIP & CONFIDENTIALITY */}
                    <section id="section-5" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                05
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Chamber Data Ownership &amp; Confidentiality
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            You retain full legal ownership, title, and control over all case files, client records,
                            schedules, notes, and uploaded documents (&ldquo;Chamber Data&rdquo;) entered into the
                            Platform. We act solely as a secure technical host and never sell, mine, or disclose your
                            Chamber Data to third parties, as detailed in our{' '}
                            <Link
                                href="/privacy-policy"
                                className="font-bold text-[#2A3642] dark:text-white underline hover:opacity-80"
                            >
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </section>

                    {/* 06. ACCEPTABLE USE POLICY */}
                    <section id="section-6" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                06
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Acceptable Use Policy
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            When using {productName}, you agree not to:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                Attempt to bypass authentication controls, security rules, or workspace isolation
                                boundaries between Chambers.
                            </li>
                            <li>
                                Upload malicious files, viruses, executable scripts, or content that violates any
                                applicable law or professional ethics rule.
                            </li>
                            <li>
                                Reverse-engineer, decompile, scrape, or resell access to the Platform or its underlying
                                software architecture.
                            </li>
                        </ul>
                    </section>

                    {/* 07. INTELLECTUAL PROPERTY RIGHTS */}
                    <section id="section-7" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                07
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Intellectual Property Rights
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            All rights, title, and interest in and to <strong>{productName}</strong>—including its
                            source code, user interface design, workflows, trademarks, and documentation—belong
                            exclusively to <strong>{companyLegalName}</strong>. Subject to your compliance with these
                            Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access
                            and use the Platform for your internal legal practice during your active subscription.
                        </p>
                    </section>

                    {/* 08. SERVICE AVAILABILITY & MAINTENANCE */}
                    <section id="section-8" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                08
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Service Availability &amp; Maintenance
                                <Server size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We strive to maintain high availability and reliable performance for daily legal operations.
                            However, temporary interruptions may occur due to scheduled security updates, cloud
                            infrastructure maintenance, or events beyond our reasonable control (including internet or
                            telecommunications disruptions). Whenever practicable, scheduled maintenance will be
                            performed outside standard court hours.
                        </p>
                    </section>

                    {/* 09. DISCLAIMERS & LIMITATION OF LIABILITY */}
                    <section id="section-9" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                09
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Disclaimers &amp; Limitation of Liability
                                <AlertTriangle size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">No Legal Advice:</strong>{' '}
                                {productName} is an organizational productivity tool. Nothing on the Platform
                                constitutes legal, financial, or regulatory advice.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Professional Diligence:</strong>{' '}
                                Subscribers must maintain independent verification of court appearances, filing
                                deadlines, and client notices.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Liability Cap:</strong> To the
                                maximum extent permitted by applicable law, <strong>{companyLegalName}</strong> shall
                                not be liable for any indirect, incidental, consequential, or special damages (including
                                missed court dates or loss of profits). Our total aggregate liability arising out of or
                                relating to the Platform shall not exceed the total subscription fees actually paid by
                                your Chamber during the three (3) months preceding the claim.
                            </li>
                        </ul>
                    </section>

                    {/* 10. TERMINATION & DATA EXPORT */}
                    <section id="section-10" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                10
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Termination &amp; Data Export
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            You may cancel your subscription at any time by contacting our support team. We may suspend
                            or terminate access if a Chamber materially breaches these Terms or fails to settle overdue
                            subscription invoices. Upon termination, you will be provided a{' '}
                            <strong>{gracePeriodDays}-day</strong> grace period to export your Chamber Data, after which
                            all records will be permanently purged in accordance with our Privacy Policy. Purchased SMS
                            credits are non-refundable once credited to a Chamber account.
                        </p>
                    </section>

                    {/* 11. GOVERNING LAW & CONTACT */}
                    <section id="section-11" className="p-6 sm:p-8 scroll-mt-20 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                11
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Governing Law &amp; Contact Information
                                <Gavel size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            These Terms shall be governed by and construed in accordance with the laws of the{' '}
                            <strong>{governingLaw}</strong>. We may revise these Terms from time to time and will
                            notify Subscribers via registered email at least <strong>{noticeDays} days</strong> before
                            material changes take effect. For questions regarding these Terms, contact{' '}
                            <strong>{companyLegalName}</strong>:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                            <a
                                href={`mailto:${supportEmail}`}
                                className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 hover:border-[#465769] transition"
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shrink-0">
                                    <Mail size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-400">
                                        Email
                                    </p>
                                    <p className="text-xs sm:text-sm font-bold text-[#2A3642] dark:text-white truncate">
                                        {supportEmail}
                                    </p>
                                </div>
                            </a>

                            <a
                                href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 hover:border-[#465769] transition"
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shrink-0">
                                    <Phone size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-400">
                                        Telephone
                                    </p>
                                    <p className="text-xs sm:text-sm font-bold text-[#2A3642] dark:text-white truncate">
                                        {contactPhone}
                                    </p>
                                </div>
                            </a>

                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50">
                                <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shrink-0">
                                    <MapPin size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-400">
                                        Postal Address
                                    </p>
                                    <p className="text-xs sm:text-sm font-bold text-[#2A3642] dark:text-white truncate">
                                        {companyAddress}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#465769] dark:text-slate-400 pt-2">
                    <span>
                        &copy; {copyrightYear} {companyLegalName}. All rights reserved. • {productName}
                    </span>
                    <div className="flex items-center gap-4">
                        <Link href="/privacy-policy" className="font-bold underline hover:text-[#2A3642] dark:hover:text-white">
                            Privacy Policy
                        </Link>
                        <Link href="/terms-and-conditions" className="font-bold underline hover:text-[#2A3642] dark:hover:text-white">
                            Terms &amp; Conditions
                        </Link>
                    </div>
                </footer>
            </main>
        </div>
    );
}