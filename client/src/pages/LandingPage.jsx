import {
    ArrowRight,
    Bell,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    GraduationCap,
    HeartPulse,
    LayoutDashboard,
    LockKeyhole,
    MessageSquare,
    Play,
    Scissors,
    Settings,
    ShieldCheck,
    Sparkles,
    Store,
    TrendingUp,
    Users,
    Wrench,
} from "lucide-react";
import { BrandWordmark } from "./components/Brand.jsx";

const agents = [
    [
        "Coordinator",
        "Understands your goals and plans the workflow",
        Sparkles,
        "bg-[#fff0e5] text-orange",
    ],
    [
        "Customer",
        "Handles enquiries, bookings and communication",
        MessageSquare,
        "bg-[#eaf2ff] text-[#286bea]",
    ],
    [
        "Operations",
        "Manages schedules, staff and daily tasks",
        CalendarDays,
        "bg-[#f0e9ff] text-[#7047e8]",
    ],
    [
        "Resolution",
        "Handles complaints, refunds and service recovery",
        ShieldCheck,
        "bg-[#e4f8ef] text-[#07925d]",
    ],
];

const businesses = [
    [Scissors, "Salons & spas"],
    [Wrench, "Repair services"],
    [Users, "Gyms & fitness"],
    [GraduationCap, "Tutoring centers"],
    [HeartPulse, "Clinics & wellness"],
    [Store, "More businesses"],
];

const pageShell =
    "min-h-screen overflow-hidden bg-[#fffdfb] font-ui text-navy [&_*]:box-border [&_button]:cursor-pointer [&_button]:font-ui [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:brightness-[.97] [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-orange [&_a]:text-inherit [&_a]:no-underline"
;

export default function LandingPage({ navigate }) {
    return (
        <div className={pageShell}>
            <header className="mx-auto flex h-20 max-w-[1440px] items-center px-8 mobile:px-5">
                <button
                    className="flex items-center gap-2 border-0 bg-transparent p-0 text-2xl font-extrabold tracking-tight"
                    onClick={() => navigate("/")}
                >
                    <BrandWordmark />
                </button>
                <nav className="mx-auto flex items-center gap-9 text-xs font-semibold desktop:hidden">
                    <a href="#features">Features</a>
                    <a href="#how">How it works</a>
                    <a href="#use-cases">Use cases</a>
                    <a href="#agents">AI agents</a>
                    <a href="#security">Security</a>
                    <a href="#pricing">Pricing</a>
                </nav>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/login")}
                        className="border-0 bg-transparent px-3 py-2 text-xs font-semibold"
                    >
                        Sign in
                    </button>
                    <button
                        onClick={() => navigate("/signup")}
                        className="rounded-xl border-0 bg-orange px-5 py-3 text-xs font-bold text-white shadow-[0_8px_22px_#ff550b2a] mobile:hidden"
                    >
                        Get started free
                    </button>
                </div>
            </header>
            <main>
                <section className="relative mx-auto grid max-w-[1440px] grid-cols-[.78fr_1.22fr] items-center gap-14 px-8 pb-10 pt-8 desktop:grid-cols-1 mobile:px-5 mobile:pt-4">
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd9c5] bg-white px-4 py-2 text-[11px] font-semibold">
                            <Sparkles size={14} className="text-orange" /> AI-powered
                            operations for service businesses
                        </span>

                        <h1 className="mt-6 max-w-xl text-[64px] font-extrabold leading-[.98] tracking-[-3.5px] laptop:text-5xl mobile:text-[42px] mobile:tracking-[-2px]">
                            Your business runs smoother{" "}
                            <span className="text-orange">with AI.</span>
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-[#536482] mobile:text-base mobile:leading-7">
                            From customer enquiries to staff scheduling and service recovery,
                            OperIq coordinates the work so you can focus on growing your
                            business.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <button
                                onClick={() => navigate("/signup")}
                                className="flex items-center gap-3 rounded-xl border-0 bg-orange px-7 py-4 text-sm font-bold text-white shadow-[0_12px_30px_#ff550b30]"
                            >
                                Get started free <ArrowRight size={18} />
                            </button>
                            <a
                                href="#how"
                                className="flex items-center gap-3 rounded-xl border border-[#f0d9ca] bg-white px-7 py-4 text-sm font-bold"
                            >
                                <Play size={17} fill="currentColor" /> See how it works
                            </a>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-5 text-xs text-[#536482]">
                            {[
                                "Set up in minutes",
                                "AI agents handle operations",
                                "You stay in control",
                            ].map((item) => (
                                <span className="flex items-center gap-2" key={item}>
                                    <CheckCircle2 size={16} className="text-orange" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                    <DashboardPreview />
                </section>

                <section
                    id="features"
                    className="mx-auto grid max-w-[1440px] grid-cols-[270px_repeat(4,1fr)] gap-4 px-8 py-7 desktop:grid-cols-2 mobile:grid-cols-1 mobile:px-5"
                >
                    <div id="agents">
                        <h2 className="text-xl font-extrabold">Meet your AI team</h2>
                        <p className="mt-2 text-xs leading-5 text-[#687895]">
                            Four specialized agents working together to keep your business
                            running smoothly.
                        </p>
                        <a
                            href="#how"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange"
                        >
                            Learn more <ArrowRight size={13} />
                        </a>
                    </div>
                    {agents.map(([name, desc, Icon, color]) => (
                        <article
                            key={name}
                            className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-[0_5px_18px_#10204408]"
                        >
                            <span
                                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${color}`}
                            >
                                <Icon size={22} />
                            </span>
                            <div>
                                <strong className="text-sm">{name}</strong>
                                <p className="mt-1 text-[11px] leading-4 text-[#687895]">
                                {desc}
                                </p>
                            </div>
                        </article>
                    ))}
                </section>

                <section
                    id="use-cases"
                    className="mx-auto flex max-w-[1440px] items-center gap-6 border-y border-[#f1ede9] px-8 py-6 desktop:flex-wrap mobile:px-5"
                >
                    <div className="mr-auto max-w-[340px]">
                        <h2 className="text-xl font-extrabold">
                            Built for service businesses
                        </h2>
                        <p className="mt-1 text-sm text-[#687895]">
                            OperIq adapts to your workflow, whether you run a salon, repair
                            shop, gym or tutoring center.
                        </p>
                    </div>
                    {businesses.map(([Icon, label]) => (
                        <article
                            key={label}
                            className="flex min-w-[135px] flex-col items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-[11px] font-semibold"
                        >
                            <Icon size={21} className="text-orange" />
                            {label}
                        </article>
                    ))}
                </section>

                <section
                    id="how"
                    className="mx-auto grid max-w-[1440px] grid-cols-[300px_repeat(3,1fr)] gap-7 px-8 py-9 desktop:grid-cols-1 mobile:px-5"
                >
                    <div>
                        <h2 className="text-xl font-extrabold">How OperIq works</h2>
                        <p className="mt-2 text-xs text-[#687895]">
                            Get started in minutes and let AI handle the busy work.
                        </p>
                    </div>

                    {[
                        [
                            "1",
                            "Tell OperIq your goal",
                            "“Schedule tomorrow's appointments” or “Handle this customer complaint.”",
                        ],
                        [
                            "2",
                            "AI coordinates the work",
                            "Plans, checks availability, assigns staff and prepares responses.",
                        ],
                        [
                            "3",
                            "You approve important decisions",
                            "Review changes, refunds or escalations before they run.",
                        ],
                    ].map(([n, title, copy]) => (
                        <article className="flex gap-4" key={n}>
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange text-sm font-bold text-white">
                                {n}
                            </span>
                            <div>
                                <strong className="text-sm">{title}</strong>
                                <p className="mt-1 text-xs leading-5 text-[#687895]">{copy}</p>
                            </div>
                        </article>
                    ))}
                </section>

                <section
                    id="security"
                    className="mx-auto mb-8 grid max-w-[1376px] grid-cols-[1.2fr_repeat(3,.8fr)] items-center gap-4 rounded-2xl bg-[#f3f7ff] p-7 desktop:grid-cols-1 mobile:mx-5"
                >
                    <div className="flex gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#dfe8ff] text-[#315de7]">
                            <ShieldCheck />
                        </span>
                        <div>
                            <small className="font-semibold">AI with control</small>
                            <h2 className="text-xl font-extrabold">
                                Powered by <span className="text-[#315de7]">ArmorIQ</span>
                            </h2>
                            <p className="mt-1 text-xs text-[#687895]">
                                Every AI action is governed by your policies and permissions.
                            </p>
                        </div>
                    </div>

                    {[
                        [LockKeyhole, "Fine-grained permissions"],
                        [FileText, "Approval workflows"],
                        [TrendingUp, "Full audit trail"],
                    ].map(([Icon, label]) => (
                        <article
                            className="flex items-center gap-3 rounded-xl border border-[#dce5f5] bg-white p-4 text-xs font-bold"
                            key={label}
                        >
                            <Icon className="text-[#315de7]" size={20} />
                            {label}
                        </article>
                    ))}
                </section>

                <section
                    id="pricing"
                    className="mx-auto mb-8 flex max-w-[1376px] items-center justify-between rounded-2xl bg-[#fff0e3] px-12 py-7 mobile:mx-5 mobile:flex-col mobile:items-start mobile:gap-5 mobile:px-6"
                >
                    <h2 className="text-2xl font-extrabold">
                        Spend less time managing.
                        <br />
                        <span className="text-orange">More time growing.</span>
                    </h2>
                    <div className="text-center">
                        <button
                            onClick={() => navigate("/signup")}
                            className="flex items-center gap-3 rounded-xl border-0 bg-orange px-8 py-4 text-sm font-bold text-white shadow-[0_10px_28px_#ff550b28]"
                        >
                            Get started free <ArrowRight size={18} />
                        </button>
                        <small className="mt-2 block text-[10px] text-[#7c879b]">
                            No credit card required
                        </small>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function DashboardPreview() {
    const metrics = [
        ["24", "Appointments", "text-[#07925d]"],
        ["18", "Customers", "text-[#286bea]"],
        ["3", "Pending approvals", "text-orange"],
        ["₹42,850", "Revenue", "text-[#07925d]"],
    ];
    return (
        <div className="relative rounded-[28px] bg-[#fff0e2] p-7 shadow-[0_30px_80px_#76350012] desktop:mx-auto desktop:w-full desktop:max-w-4xl mobile:p-3">
            <div className="rotate-[1.5deg] overflow-hidden rounded-xl border border-[#e8ebf1] bg-white shadow-[0_28px_65px_#24345418]">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs">
                    <i className="h-2 w-2 rounded-full bg-[#ff6540]" />
                    <i className="h-2 w-2 rounded-full bg-[#ffc642]" />
                    <i className="h-2 w-2 rounded-full bg-[#2bc786]" />
                    <span className="ml-6 rounded-lg bg-[#f5f7fa] px-5 py-2 text-[#8993a7]">
                        Search customers, appointments, tasks…
                    </span>
                    <Bell className="ml-auto" size={15} />
                    <span className="text-[10px] font-bold">Evergreen Studio</span>
                </div>

                <div className="grid grid-cols-[120px_1fr] mobile:grid-cols-1">
                    <aside className="border-r border-border bg-[#fffaf6] p-4 mobile:hidden">
                        <strong className="text-xs">OperIq</strong>
                        {[
                            [LayoutDashboard, "Dashboard"],
                            [Users, "Customers"],
                            [CalendarDays, "Appointments"],
                            [ClipboardCheck, "Tasks"],
                            [Sparkles, "AI agents"],
                            [ShieldCheck, "Approvals"],
                            [Settings, "Settings"],
                        ].map(([Icon, label]) => (
                            <span
                                className={`mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-[9px] ${label === "Dashboard" ? "bg-[#fff0e5] font-bold text-orange" : "text-[#536482]"}`}
                                key={label}
                            >
                                <Icon size={12} />
                                {label}
                            </span>
                        ))}
                    </aside>
                    <div className="p-5 mobile:p-4">
                        <div className="flex justify-between">
                            <div>
                                <h3 className="text-xl font-extrabold">Dashboard</h3>
                                <p className="mt-1 text-[9px] text-[#7b879d]">
                                    Here's what's happening with your business today.
                                </p>
                            </div>
                            <span className="h-fit rounded-md border border-border px-3 py-1.5 text-[9px]">
                                Today⌄
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2 mobile:grid-cols-2">
                            {metrics.map(([value, label, color]) => (
                                <article
                                    className="rounded-lg border border-border p-3 shadow-[0_3px_12px_#13213b08]"
                                    key={label}
                                >
                                    <strong className={`text-lg ${color}`}>{value}</strong>
                                    <p className="mt-1 text-[8px] text-[#6d7891]">{label}</p>
                                </article>
                            ))}
                        </div>

                        <div className="mt-3 grid grid-cols-[1.05fr_.95fr] gap-3 mobile:grid-cols-1">
                            <article className="rounded-lg border border-border p-3">
                                <div className="flex justify-between">
                                    <strong className="text-[10px]">Today's schedule</strong>
                                    <small className="text-[8px] text-[#71809b]">
                                        View all →
                                    </small>
                                </div>
                                {[
                                    ["10:00 AM", "Haircut & styling", "Confirmed"],
                                    ["11:30 AM", "Hair color", "Confirmed"],
                                    ["01:00 PM", "Facial treatment", "In progress"],
                                    ["03:30 PM", "Beard trim", "Confirmed"],
                                ].map(([time, service, status]) => (
                                    <div
                                        className="mt-2 grid grid-cols-[55px_1fr_auto] items-center border-l-2 border-orange pl-2 text-[8px]"
                                        key={time}
                                    >
                                        <strong>{time}</strong>
                                        <span>{service}</span>
                                        <span className="rounded-full bg-[#def6e9] px-2 py-1 text-[#078a57]">
                                            {status}
                                        </span>
                                    </div>
                                ))}
                            </article>
                            <article className="rounded-lg border border-border p-3">
                                <div className="flex justify-between">
                                    <strong className="text-[10px]">AI agents</strong>
                                    <small className="text-[8px] text-[#71809b]">
                                        View all →
                                    </small>
                                </div>
                                {agents.map(([name, desc, Icon, color]) => (
                                    <div className="mt-2 flex items-center gap-2" key={name}>
                                        <span
                                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${color}`}
                                        >
                                            <Icon size={12} />
                                        </span>
                                        <div className="min-w-0">
                                            <strong className="block text-[8px]">{name}</strong>
                                            <small className="block truncate text-[7px] text-[#71809b]">
                                                {desc}
                                            </small>
                                        </div>
                                        <span className="ml-auto rounded-full bg-[#dcf5e9] px-2 py-1 text-[7px] text-[#078a57]">
                                            Active
                                        </span>
                                    </div>
                                ))}
                            </article>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Footer() {
    return (
        <footer className="border-t border-[#eceff4] bg-white">
            <div className="mx-auto grid max-w-[1376px] grid-cols-[1.4fr_repeat(3,.7fr)] gap-10 px-8 py-10 desktop:grid-cols-2 mobile:grid-cols-1 mobile:px-5">
                <div>
                    <div className="flex items-center gap-2 text-2xl font-extrabold">
                        <BrandWordmark />
                    </div>
                    <p className="mt-4 max-w-sm text-xs leading-5 text-[#71809b]">
                        AI-powered operations for service businesses. Coordinate your
                        people, customers, and daily work from one secure workspace.
                    </p>
                </div>
                {[
                    ["Product", ["Features", "AI agents", "Security", "Pricing"]],
                    [
                        "Solutions",
                        ["Salons & spas", "Repair services", "Clinics", "Tutoring"],
                    ],
                    ["Company", ["About", "Contact", "Privacy", "Terms"]],
                ].map(([title, links]) => (
                    <div key={title}>
                        <strong className="text-xs">{title}</strong>
                        {links.map((link) => (
                        <a
                            className="mt-3 block text-xs text-[#71809b]"
                            href="#features"
                            key={link}
                        >
                            {link}
                        </a>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mx-auto flex max-w-[1376px] items-center justify-between border-t border-[#eceff4] px-8 py-5 text-[10px] text-[#8792a5] mobile:flex-col mobile:gap-2 mobile:px-5">
                <span>&copy; {new Date().getFullYear()} OperIq. All rights reserved.</span>
                <span>Built with intention. Governed with ArmorIQ.</span>
            </div>
        </footer>
    );
}
