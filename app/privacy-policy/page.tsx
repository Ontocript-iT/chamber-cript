import type { Metadata } from 'next';
import Link from 'next/link';
import {
    Scale,
    ShieldCheck,
    Lock,
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Database,
    EyeOff,
    Clock,
    UserCheck,
    Bell,
} from 'lucide-react';

// Update these values with your official company details
const POLICY_CONFIG = {
    productName: 'ChamberCript',
    companyLegalName: 'Ontocript IT (Pvt) Ltd',
    effectiveDate: 'November 23, 2026',
    copyrightYear: '2026',
    retentionDays: 30,
    noticeDays: 15,
    supportEmail: 'support@chambercript.com',
    contactPhone: '+94 74 277 9914',
    companyAddress: 'Kalutara, Sri Lanka',
};

export const metadata: Metadata = {
    title: `Privacy Policy | ${POLICY_CONFIG.productName}`,
    description: `Data Protection & Confidentiality Policy for ${POLICY_CONFIG.productName} by ${POLICY_CONFIG.companyLegalName}.`,
};

const SECTIONS = [
    { id: 'section-1', number: '01', title: 'Introduction and Scope' },
    { id: 'section-2', number: '02', title: 'Information We Collect' },
    { id: 'section-3', number: '03', title: 'No Data Selling or Sharing' },
    { id: 'section-4', number: '04', title: 'Attorney-Client Privilege' },
    { id: 'section-5', number: '05', title: 'How We Use Account Info' },
    { id: 'section-6', number: '06', title: 'Data Security & Safeguards' },
    { id: 'section-7', number: '07', title: 'Data Retention & Deletion' },
    { id: 'section-8', number: '08', title: 'Your Rights Over Information' },
    { id: 'section-9', number: '09', title: 'Changes to This Policy' },
    { id: 'section-10', number: '10', title: 'Contact Us' },
];

export default function PrivacyPolicyPage() {
    const {
        productName,
        companyLegalName,
        effectiveDate,
        retentionDays,
        noticeDays,
        supportEmail,
        contactPhone,
        companyAddress,
    } = POLICY_CONFIG;

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

                    <div className="flex items-center gap-3">
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
                        <ShieldCheck size={14} /> Data Protection &amp; Confidentiality Policy
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
                    <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                        <span>
                            <strong className="text-white">Platform :</strong> {productName}
                        </span>
                        <span>
                            <strong className="text-white">Provider:</strong> {companyLegalName}
                        </span>
                        <span>
                            <strong className="text-white">Effective Date:</strong> {effectiveDate}
                        </span>
                    </div>
                </div>

                {/* Core Privacy Commitment Highlight */}
                <div className="bg-emerald-50/90 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Lock size={19} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                            Our Core Privacy Commitment
                        </h2>
                        <p className="text-sm leading-relaxed text-emerald-950/90 dark:text-emerald-100/90 font-medium">
                            At <strong>{companyLegalName}</strong>, we recognize that legal practice is built on strict
                            confidentiality and Attorney-Client Privilege. We collect only the minimum personal
                            information necessary to create and secure your Chamber account.{' '}
                            <strong>
                                We never sell, rent, trade, or share your personal information or your Chamber&apos;s
                                case data with any third parties.
                            </strong>
                        </p>
                    </div>
                </div>

                {/* Quick Navigation Grid */}
                <nav
                    aria-label="Privacy Policy Sections"
                    className="bg-white dark:bg-[#2A3642] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-[#465769]/40 shadow-2xs"
                >
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-3">
                        Quick Navigation
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
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

                {/* Policy Body Sections */}
                <div className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm divide-y divide-slate-200/80 dark:divide-[#465769]/40">
                    {/* 1. INTRODUCTION AND SCOPE */}
                    <section id="section-1" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                01
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Introduction and Scope
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            This Privacy Policy explains how <strong>{companyLegalName}</strong> (&ldquo;we,&rdquo;
                            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, stores, uses, and protects information
                            when Attorneys-at-Law, Legal Chambers, and their authorized staff (&ldquo;you&rdquo; or
                            &ldquo;Subscribers&rdquo;) register for and use <strong>{productName}</strong> (the
                            &ldquo;Platform&rdquo;). By creating an account or accessing the Platform, you consent to
                            the data practices described in this Policy.
                        </p>
                    </section>

                    {/* 2. INFORMATION WE COLLECT */}
                    <section id="section-2" className="p-6 sm:p-8 scroll-mt-20 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                02
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Information We Collect
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We strictly adhere to the principle of data minimization. We do not collect unnecessary
                            personal profiles, browsing histories, or marketing analytics. The information handled on
                            the Platform falls into two distinct categories:
                        </p>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#465769]/50">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                <tr className="bg-[#2A3642] dark:bg-[#1E2730] text-white text-xs uppercase tracking-wider">
                                    <th className="py-3.5 px-4 font-extrabold w-1/4">Data Category</th>
                                    <th className="py-3.5 px-4 font-extrabold w-2/5">Specific Data Elements</th>
                                    <th className="py-3.5 px-4 font-extrabold">Purpose of Collection</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-[#465769]/40 bg-[#F8FAFC] dark:bg-[#222C36]">
                                <tr>
                                    <td className="py-4 px-4 font-bold text-[#2A3642] dark:text-white align-top">
                                        1. Account Registration Information
                                    </td>
                                    <td className="py-4 px-4 text-[#465769] dark:text-slate-300 align-top">
                                        Full Name, Chamber/Firm Name, Email Address, Telephone / Mobile Number, and
                                        Account Password (stored exclusively in cryptographically hashed form).
                                    </td>
                                    <td className="py-4 px-4 text-[#465769] dark:text-slate-300 align-top">
                                        Account creation, user authentication, password recovery, subscription
                                        administration, and essential service alerts.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-4 font-bold text-[#2A3642] dark:text-white align-top">
                                        2. Chamber &amp; Case Data (User-Controlled)
                                    </td>
                                    <td className="py-4 px-4 text-[#465769] dark:text-slate-300 align-top">
                                        Case files, client records, court diary dates, notes, and uploaded
                                        documents entered by your Chamber into the Platform.
                                    </td>
                                    <td className="py-4 px-4 text-[#465769] dark:text-slate-300 align-top">
                                        Stored solely on your behalf so your Chamber can manage daily legal
                                        operations. We do not access, read, or mine this data.
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/90 dark:border-[#465769]/40 text-xs sm:text-sm text-[#465769] dark:text-slate-300">
                            <strong className="text-[#2A3642] dark:text-white">Password Security:</strong> Your
                            password is never stored in plain text. It is immediately converted into an irreversible
                            cryptographic hash upon entry, meaning neither our administrators nor any external party
                            can ever view your actual password.
                        </div>
                    </section>

                    {/* 3. STRICT PROHIBITION ON DATA SELLING AND THIRD-PARTY SHARING */}
                    <section id="section-3" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                03
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Strict Prohibition on Data Selling and Third-Party Sharing
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We maintain a zero-tolerance policy regarding the commercialization or unauthorized
                            distribution of user data:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">No Sale of Data:</strong> We do not
                                sell, license, rent, or monetize your name, contact details, usage logs, or Chamber
                                Data to data brokers, advertisers, or any commercial entity under any circumstances.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">No Third-Party Disclosure:</strong>{' '}
                                We do not share, disclose, or transfer your personal information or Chamber Data to any
                                outside third parties, marketing agencies, or affiliated companies.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">No Data Mining or Profiling:</strong>{' '}
                                We do not scan, index, or analyze your confidential case documents or client lists for
                                advertising, AI model training, or commercial profiling.
                            </li>
                        </ul>
                    </section>

                    {/* 4. ATTORNEY-CLIENT PRIVILEGE AND CHAMBER DATA ISOLATION */}
                    <section id="section-4" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                04
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Attorney-Client Privilege and Chamber Data Isolation
                                <EyeOff size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            All case records, client details, and documents uploaded into <strong>{productName}</strong>{' '}
                            remain the sole and exclusive property of your Chamber and are protected by
                            Attorney-Client Privilege. Your Chamber&apos;s workspace is logically isolated from all
                            other subscribers on the Platform.
                        </p>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            Our technical staff will never access or view your Chamber&apos;s records unless you
                            explicitly request technical assistance and grant temporary permission, or unless strictly
                            required by a binding order of a competent Court of Law (in which case we will notify you
                            immediately unless legally prohibited from doing so).
                        </p>
                    </section>

                    {/* 5. HOW WE USE YOUR ACCOUNT INFORMATION */}
                    <section id="section-5" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                05
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                How We Use Your Account Information
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            The limited registration details you provide (Name, Phone Number, Email Address) are used
                            strictly for:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                Verifying your identity and maintaining secure access to your Chamber account and
                                authorized sub-accounts (such as Junior Counsel or Clerks).
                            </li>
                            <li>
                                Sending critical system notifications, such as password reset links, security alerts,
                                court diary reminders configured by you, and subscription invoices.
                            </li>
                            <li>Providing direct customer and technical support when requested by your Chamber.</li>
                        </ul>
                    </section>

                    {/* 6. DATA SECURITY AND STORAGE SAFEGUARDS */}
                    <section id="section-6" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                06
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Data Security and Storage Safeguards
                                <Database size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We employ robust technical and organizational measures to safeguard your account
                            credentials and Chamber Data against unauthorized access, loss, or alteration:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">
                                    Encryption in Transit and at Rest:
                                </strong>{' '}
                                All communications between your device and our servers are encrypted using
                                industry-standard TLS/SSL protocols, and stored data is encrypted at rest.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Access Controls:</strong> Strict
                                role-based permissions ensure that only authorized members of your Chamber can view or
                                modify internal records according to the privileges set by your Chamber Administrator.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Automated Backups:</strong> Regular
                                encrypted backups are maintained solely to ensure business continuity and disaster
                                recovery for your Chamber.
                            </li>
                        </ul>
                    </section>

                    {/* 7. DATA RETENTION AND ACCOUNT DELETION */}
                    <section id="section-7" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                07
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Data Retention and Account Deletion
                                <Clock size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We retain your account information (Name, Email, Phone Number) and Chamber Data only for as
                            long as your Chamber maintains an active subscription with us. Upon cancellation or
                            termination of your account, you may export all your Chamber Data during the
                            post-termination grace period. Thereafter, all personal registration details and Chamber
                            Data are permanently and irreversibly purged from our active servers and backup systems
                            within <strong>{retentionDays} days</strong>.
                        </p>
                    </section>

                    {/* 8. YOUR RIGHTS OVER YOUR INFORMATION */}
                    <section id="section-8" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                08
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Your Rights Over Your Information
                                <UserCheck size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            As a Subscriber, you retain complete control over your personal and Chamber information and
                            have the right to:
                        </p>
                        <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#465769] dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Access and Update:</strong> View,
                                correct, or update your name, email address, telephone number, and password at any time
                                directly through your account settings.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">Data Export:</strong> Download a
                                complete copy of all records and documents stored in your Chamber workspace.
                            </li>
                            <li>
                                <strong className="text-[#2A3642] dark:text-white">
                                    Erasure (Right to be Forgotten):
                                </strong>{' '}
                                Request permanent deletion of your account and all associated data from our systems upon
                                closing your account.
                            </li>
                        </ul>
                    </section>

                    {/* 9. CHANGES TO THIS PRIVACY POLICY */}
                    <section id="section-9" className="p-6 sm:p-8 scroll-mt-20 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                09
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white flex items-center gap-2">
                                Changes to This Privacy Policy
                                <Bell size={18} className="text-[#465769] dark:text-slate-400" />
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            We may update this Privacy Policy occasionally to reflect security enhancements or legal
                            requirements. However, we will never weaken our core commitment against selling or sharing
                            your data with third parties. Any updates will be communicated to your registered email
                            address at least <strong>{noticeDays} days</strong> before taking effect.
                        </p>
                    </section>

                    {/* 10. CONTACT US */}
                    <section id="section-10" className="p-6 sm:p-8 scroll-mt-20 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">
                                10
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">
                                Contact Us
                            </h2>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#465769] dark:text-slate-300">
                            If you have any questions, security inquiries, or requests regarding your personal
                            information or this Privacy Policy, please contact our Data Protection Officer at{' '}
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
                <footer className="text-center text-xs text-[#465769] dark:text-slate-400 pt-2">
                    &copy; {POLICY_CONFIG.copyrightYear} {companyLegalName}. All rights reserved. • {productName}
                </footer>
            </main>
        </div>
    );
}