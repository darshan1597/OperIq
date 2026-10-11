import { useState } from "react";
import {
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    UserRound,
    Users,
} from "lucide-react";
import { BrandWordmark } from "./components/Brand.jsx";
import { apiClient, apiError } from "../api/client.js";
import { signInWithGoogle } from "../firebase.js";

const benefits = [
    "Set up your workspace in minutes",
    "Bring in your customers and staff",
    "Let AI handle day-to-day operations",
    "Stay in control with approvals",
    "Secure and governed by ArmorIQ",
];
const agentCards = [
    [
        "Customer",
        "Handles enquiries and messages",
        Users,
        "bg-[#fff0e5] text-orange",
    ],
    [
        "Operations",
        "Schedules staff and day-to-day tasks",
        CalendarDays,
        "bg-[#f0e9ff] text-[#7047e8]",
    ],
    [
        "Coordinator",
        "Plans and manages workflows",
        MessageSquare,
        "bg-[#eaf2ff] text-[#286bea]",
    ],
    [
        "Resolution",
        "Handles complaints and service recovery",
        ShieldCheck,
        "bg-[#e4f8ef] text-[#07925d]",
    ],
];

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.7 4.7 0 0 1-2 3v2.7h3.4c2-1.8 3-4.5 3-7.7Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 5-.9 6.8-2.4l-3.4-2.7c-.9.6-2.1 1-3.4 1a6 6 0 0 1-5.7-4.1H2.8v2.8A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.3 13.8A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.8V7.4H2.8A10 10 0 0 0 2 12c0 1.6.4 3.2.8 4.6l3.5-2.8Z"
            />
            <path
                fill="#EA4335"
                d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9.2 5.4l3.5 2.8A6 6 0 0 1 12 6.1Z"
            />
        </svg>
    );
}

export default function AuthPage({ mode, onAuthenticated, navigate }) {
    const signup = mode === "signup";
    const [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [visible, setVisible] = useState(false),
        [confirmVisible, setConfirmVisible] = useState(false);
    const finish = (data) => {
        onAuthenticated(data);
        navigate("/app");
    };
    const submit = async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        if (signup && values.password !== values.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        delete values.confirmPassword;
        delete values.remember;
        setBusy(true);
        setError("");
        try {
            finish(
                (
                await apiClient.post(
                    signup ? "/auth/register" : "/auth/login",
                    values,
                )
                ).data,
            );
        } catch (reason) {
            setError(apiError(reason));
        } finally {
            setBusy(false);
        }
    };
    const google = async () => {
        setBusy(true);
        setError("");
        try {
            const idToken = await signInWithGoogle();
            finish((await apiClient.post("/auth/google", { idToken })).data);
        } catch (reason) {
            setError(apiError(reason));
        } finally {
            setBusy(false);
        }
    };
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff9f4,transparent_55%),#f8f7f5] p-5 font-ui text-navy mobile:p-0">
            <div className="relative mx-auto grid min-h-[calc(100vh-42px)] max-w-[1460px] grid-cols-[42%_58%] overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_25px_90px_#59341d16] compact:grid-cols-1 mobile:min-h-screen mobile:rounded-none">
                <section className="relative z-10 flex flex-col bg-white px-14 py-8 laptop:px-9 mobile:px-5 mobile:py-7">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 border-0 bg-transparent p-0 text-3xl font-extrabold tracking-tight"
                        >
                            <BrandWordmark />
                        </button>
                        {!signup && (
                            <p className="text-xs text-[#4f6080]">
                                Don&apos;t have an account?{" "}
                                <button
                                    onClick={() => navigate("/signup")}
                                    className="border-0 bg-transparent p-1 font-bold text-orange"
                                >
                                    Sign up
                                </button>
                            </p>
                        )}
                    </div>
                    <div
                        className={`mx-auto w-full max-w-[480px] ${signup ? "mt-7" : "mt-16"} laptop:mt-7`}
                    >
                        <h1 className="text-[36px] font-extrabold leading-tight tracking-[-1.4px] mobile:text-3xl">
                            {signup ? "Create your account" : "Welcome back"}
                        </h1>
                        <p className="mt-1.5 text-base leading-6 text-[#62718b]">
                            {signup ? (
                                <>
                                    Get started with operiq in minutes.
                                    <br />
                                    No credit card required.
                                </>
                            ) : (
                                <>
                                    Log in to your operiq account and
                                    <br className="mobile:hidden" /> keep your business running
                                    smoothly.
                                </>
                            )}
                        </p>
                        <form className="mt-6 space-y-3.5" onSubmit={submit}>
                            {signup && (
                                <>
                                    <Field
                                        label="Full name"
                                        name="name"
                                        placeholder="John Doe"
                                        Icon={UserRound}
                                    />
                                    <Field
                                        label="Business name"
                                        name="businessName"
                                        placeholder="Evergreen Studio"
                                        Icon={BriefcaseBusiness}
                                    />
                                </>
                            )}
                            <Field
                                label={signup ? "Work email address" : "Email address"}
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                Icon={Mail}
                            />
                            <Password
                                label="Password"
                                name="password"
                                placeholder={
                                    signup ? "Create a password" : "Enter your password"
                                }
                                visible={visible}
                                setVisible={setVisible}
                            />
                            {signup && (
                                <>
                                    <p className="-mt-2 text-[9px] text-[#6f7c93]">
                                        Must be at least 8 characters with a number and a special
                                        character.
                                    </p>
                                    <Password
                                        label="Confirm password"
                                        name="confirmPassword"
                                        placeholder="Confirm your password"
                                        visible={confirmVisible}
                                        setVisible={setConfirmVisible}
                                    />
                                </>
                            )}
                            {!signup && (
                                <div className="flex items-center justify-between text-xs">
                                    <label className="flex items-center gap-2">
                                        <input
                                            name="remember"
                                            type="checkbox"
                                            defaultChecked
                                            className="h-4 w-4 accent-orange"
                                        />
                                        Keep me logged in
                                    </label>
                                    <button
                                        type="button"
                                        className="border-0 bg-transparent p-0 font-semibold text-orange"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}
                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-[#ffd9ce] bg-[#fff4ef] px-4 py-2 text-xs text-[#b84125]"
                                    >
                                    {error}
                                </p>
                            )}
                            <button
                                disabled={busy}
                                className="flex w-full items-center justify-center gap-3 rounded-xl border-0 bg-orange px-5 py-3 text-sm font-bold text-white shadow-[0_11px_28px_#ff550b2b]"
                            >
                                {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
                                <ArrowRight size={18} />
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-4 text-[9px] font-bold uppercase tracking-[1.5px] text-[#7d899f]">
                            <span className="h-px flex-1 bg-[#dfe4eb]" />
                            or {signup ? "sign up" : "continue"} with
                            <span className="h-px flex-1 bg-[#dfe4eb]" />
                        </div>

                        <button
                            disabled={busy}
                            onClick={google}
                            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dae1ea] bg-white px-4 py-3 text-[11px] font-bold shadow-[0_3px_12px_#14213b07]"
                        >
                            <GoogleIcon />
                            {signup ? "Sign up with Google" : "Continue with Google"}
                        </button>

                        <p className="mx-auto mt-5 max-w-sm text-center text-[10px] leading-4 text-[#71809b]">
                            By {signup ? "creating an account" : "logging in"}, you agree to
                            our{" "}
                            <a href="#terms" className="font-semibold text-orange underline">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                                href="#privacy"
                                className="font-semibold text-orange underline"
                            >
                                Privacy Policy
                            </a>
                            .
                        </p>
                    </div>
                </section>
                <VisualPanel signup={signup} navigate={navigate} />
            </div>
        </main>
    );
}

function Field({ label, Icon, ...props }) {
    return (
        <label className="block text-xs font-bold">
            {label}
            <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-[#d8e0e9] px-4 text-[#71809b] focus-within:border-orange focus-within:shadow-[0_0_0_3px_#ff550b12]">
                <Icon size={18} />
                <input
                    {...props}
                    required
                    minLength="2"
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-xs text-navy outline-none placeholder:text-[#92a0b5]"
                />
            </span>
        </label>
    );
}

function Password({ label, visible, setVisible, ...props }) {
    return (
        <div>
            <label htmlFor={props.name} className="text-xs font-bold">
                {label}
            </label>
            <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-[#d8e0e9] px-4 text-[#71809b] focus-within:border-orange focus-within:shadow-[0_0_0_3px_#ff550b12]">
                <LockKeyhole size={18} />
                <input
                    {...props}
                    id={props.name}
                    type={visible ? "text" : "password"}
                    required
                    minLength="8"
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-xs text-navy outline-none placeholder:text-[#92a0b5]"
                />
                <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible((value) => !value)}
                    className="border-0 bg-transparent p-1 text-[#65758f]"
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </span>
        </div>
    );
}

function VisualPanel({ signup, navigate }) {
    return (
        <aside className="relative overflow-hidden bg-[#fff1e4] compact:hidden">
            <img
                src="/brand/auth-office-laptop.png"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff8ef50,transparent_55%)]" />

            {signup && (
                <p className="absolute right-9 top-4 z-30 text-[11px] text-[#4f6080]">
                    Already have an account?{" "}
                    <button
                        className="border-0 bg-transparent p-1 font-bold text-orange"
                        onClick={() => navigate("/login")}
                    >
                        Log in <ArrowRight className="inline" size={13} />
                    </button>
                </p>
            )}

            <div className="relative z-10 px-12 pt-11">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#ffcda9] bg-white/70 px-4 py-2 text-[9px] font-bold uppercase tracking-[1px] backdrop-blur">
                    <Sparkles size={13} className="text-orange" />
                    AI-powered operations
                </span>
                
                <h2
                    className={`${signup ? "max-w-[400px]" : "max-w-xl"} mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-1.4px]`}
                >
                    {signup ? "Start managing your business" : "Manage your business"}{" "}
                    <span className="text-orange">
                        {signup ? "with AI." : "smarter with AI."}
                    </span>
                </h2>
                <p
                    className={`${signup ? "max-w-[380px]" : "max-w-[470px]"} mt-2.5 text-base leading-6 text-[#566783]`}
                >
                    From customer enquiries to staff scheduling and service recovery,
                    OperIq coordinates the work so you can focus on growing your
                    business.
                </p>

                {signup && (
                    <div className="mt-4 flex w-fit flex-col gap-2">
                        {benefits.map((item) => (
                            <p
                                className="flex items-center gap-2.5 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-[0_5px_16px_#73380e10] backdrop-blur"
                                key={item}
                            >
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange text-white">
                                    <Check size={12} />
                                </span>
                                {item}
                            </p>
                        ))}
                    </div>
                )}
            </div>
            <AgentFloaters signup={signup} />
        </aside>
    );
}

function AgentFloaters({ signup }) {
    const positions = signup
        ? [
            "right-28 top-24",
            "right-5 top-44",
            "right-48 top-[275px]",
            "right-5 top-[330px]",
        ]
        : [
            "left-20 top-[330px]",
            "left-[315px] top-[300px]",
            "left-7 top-[445px]",
            "right-7 top-[270px]",
        ];
    return (
        <div className="absolute inset-0 z-20">
            {agentCards.map(([name, copy, Icon, color], index) => (
                <article
                    key={name}
                    className={`${positions[index]} absolute flex w-[215px] items-center gap-3 rounded-xl border border-white/70 bg-white/90 p-3 shadow-[0_10px_28px_#73380e16] backdrop-blur`}
                >
                    <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${color}`}
                    >
                        <Icon size={20} />
                    </span>
                    <div>
                        <strong className="block text-xs">{name}</strong>
                        <small className="mt-1 block text-[10px] leading-4 text-[#586984]">
                            {copy}
                        </small>
                    </div>
                </article>
            ))}
        </div>
    );
}
