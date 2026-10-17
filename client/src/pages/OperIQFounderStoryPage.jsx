import { useRef, useState } from "react";
import {
  ArrowDown,
  Bot,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { LogoMark } from "./components/Brand.jsx";

const ease = [0.22, 1, 0.36, 1];

function Enter({ children, className = "", delay = 0, direction = 45 }) {
  const ref = useRef(null);
  const visible = useInView(ref, { amount: 0.35, once: false });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: direction }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: direction }}
      transition={{ duration: 0.85, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SceneNumber({ children }) {
  return (
    <span className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.32em] text-orange">
      <span className="h-px w-10 bg-orange" /> {children}
    </span>
  );
}

function FounderPhoto() {
  const [loaded, setLoaded] = useState(true);
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[36px] border border-white/10 bg-[#11182a] shadow-[0_35px_100px_#00000080]">
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#ff783840,transparent_48%),linear-gradient(145deg,#151d32,#080b14)]">
        <div className="text-center">
          <span className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-slate-500">
            <UserRound size={52} strokeWidth={1.3} />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-slate-600">Founder photo</p>
        </div>
      </div>
      <img
        src="/brand/founder-photo.jpg"
        alt="Founder of Team RADAR"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#060914]/70 via-transparent to-transparent" />
    </div>
  );
}

function FounderRevealSection() {
  const section = useRef(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const photoScale = useTransform(scrollYProgress, [0, 0.2, 0.42, 0.78], [0.55, 1.06, 1, 0.9]);
  const photoX = useTransform(scrollYProgress, [0, 0.4, 0.72], [0, 0, -300]);
  const photoRotate = useTransform(scrollYProgress, [0, 0.32, 0.72], [-5, 0, -2]);
  const photoClip = useTransform(scrollYProgress, [0, 0.23], ["inset(50% 50% 50% 50% round 36px)", "inset(0% 0% 0% 0% round 36px)"]);
  const ringScale = useTransform(scrollYProgress, [0, 0.28, 0.72], [0.2, 1, 1.15]);
  const ringOpacity = useTransform(scrollYProgress, [0, 0.2, 0.7], [0, 0.55, 0.18]);
  const introOpacity = useTransform(scrollYProgress, [0.06, 0.2, 0.42], [0, 1, 0]);
  const introY = useTransform(scrollYProgress, [0.06, 0.23, 0.42], [40, 0, -35]);
  const nameOpacity = useTransform(scrollYProgress, [0.48, 0.66], [0, 1]);
  const nameX = useTransform(scrollYProgress, [0.48, 0.7], [260, 0]);
  const detailY = useTransform(scrollYProgress, [0.62, 0.82], [60, 0]);
  const detailOpacity = useTransform(scrollYProgress, [0.62, 0.8], [0, 1]);
  const radarOpacity = useTransform(scrollYProgress, [0.38, 0.72], [0, 0.05]);

  return (
    <section ref={section} className="relative h-[300vh] bg-[#060914]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff550b1f,transparent_42%)]" />
        <motion.p style={{ opacity: radarOpacity }} className="pointer-events-none absolute bottom-[-4%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[clamp(10rem,29vw,28rem)] font-black leading-none tracking-[-0.1em] text-white">
          RADAR
        </motion.p>

        <motion.div style={{ opacity: introOpacity, y: introY }} className="absolute left-1/2 top-[11%] z-20 -translate-x-1/2 text-center">
          <SceneNumber>Meet the builder</SceneNumber>
          <p className="mt-4 whitespace-nowrap text-sm font-semibold text-slate-400">One developer. One ambitious idea.</p>
        </motion.div>

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.div style={{ scale: ringScale, opacity: ringOpacity }} className="absolute -inset-16 rounded-full border border-dashed border-orange/60">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full">
              <i className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 rounded-full bg-orange shadow-[0_0_22px_#ff550b]" />
            </motion.span>
          </motion.div>
          <motion.div style={{ x: photoX, scale: photoScale, rotate: photoRotate, clipPath: photoClip }} className="w-[min(340px,72vw)]">
            <FounderPhoto />
          </motion.div>
        </div>

        <div className="absolute left-1/2 top-1/2 z-10 -translate-y-1/2 pl-20 desktop:pl-10 mobile:left-[42%] mobile:pl-0">
          <motion.div style={{ opacity: nameOpacity, x: nameX }} className="w-[min(570px,45vw)] mobile:w-[54vw]">
            <span className="text-[10px] font-bold uppercase tracking-[0.34em] text-orange">Hi, I&apos;m</span>
            <h1 className="mt-3 text-[clamp(4rem,8vw,8rem)] font-extrabold leading-[0.84] tracking-[-0.075em] mobile:text-5xl">
              Darshan.
            </h1>
            <div className="mt-7 h-px w-full bg-gradient-to-r from-orange via-orange/50 to-transparent" />
            <motion.div style={{ y: detailY, opacity: detailOpacity }}>
              <p className="mt-6 text-2xl font-bold mobile:text-lg"><span className="text-orange">Team RADAR.</span></p>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-400 mobile:text-xs mobile:leading-5">
                I designed and built OperIQ to turn AI from a conversational assistant into a safe operating layer for real businesses.
              </p>
            </motion.div>
          </motion.div>
        </div>

        <motion.div style={{ opacity: detailOpacity }} className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-600">
          Continue <ArrowDown size={15} />
        </motion.div>
      </div>
    </section>
  );
}

function FlowCard({ icon: Icon, title, position, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.65 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ amount: 0.45 }}
      transition={{ delay, duration: 0.65, ease }}
      className={`absolute ${position} flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101728]/90 px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange/15 text-orange"><Icon size={18} /></span>
      {title}
    </motion.div>
  );
}

function ScrollHint({ text = "Continue" }) {
  return (
    <motion.div
      animate={{ y: [0, 7, 0] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-600"
    >
      {text}<ArrowDown size={15} />
    </motion.div>
  );
}

export default function OperIQFounderStoryPage() {
  const page = useRef(null);
  const { scrollYProgress } = useScroll({ target: page, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  const orbY = useTransform(scrollYProgress, [0, 1], [-180, 420]);
  const orbRotate = useTransform(scrollYProgress, [0, 1], [-15, 35]);

  return (
    <main ref={page} className="relative overflow-x-clip bg-[#060914] font-ui text-white selection:bg-orange selection:text-white">
      <motion.div style={{ scaleX: progress }} className="fixed left-0 right-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-orange to-amber-300" />
      <div className="fixed left-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#080c19]/70 px-4 py-3 text-xl font-extrabold backdrop-blur-xl mobile:left-4 mobile:top-4">
        <LogoMark /><span>oper<span className="text-orange">iq</span></span>
      </div>
      <motion.div style={{ y: orbY, rotate: orbRotate }} className="pointer-events-none fixed -right-48 top-32 h-[34rem] w-[34rem] rounded-[9rem] border border-orange/10 bg-orange/[0.04] blur-[1px]" />

      <FounderRevealSection />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 py-28 mobile:px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff550b20,transparent_40%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <Enter><SceneNumber>Meet the product</SceneNumber></Enter>
          <Enter delay={0.1}>
            <div className="mx-auto mt-10 flex w-fit items-center gap-5 rounded-[30px] border border-orange/30 bg-white/[0.05] px-8 py-6 shadow-[0_0_100px_#ff550b35] backdrop-blur-xl">
              <div className="scale-125"><LogoMark /></div>
              <span className="text-5xl font-extrabold tracking-[-0.06em]">oper<span className="text-orange">iq</span></span>
            </div>
          </Enter>
          <Enter delay={0.24}>
            <h2 className="mx-auto mt-10 max-w-5xl text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] mobile:text-4xl">
              An AI-powered operations platform for <span className="text-orange">service businesses.</span>
            </h2>
          </Enter>
          <Enter delay={0.38}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {[Scissors, Sparkles].map((Icon, index) => (
                <span key={index} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm text-slate-300">
                  <Icon size={17} className="text-orange" /> {index === 0 ? "Salons" : "Studios"}
                </span>
              ))}
            </div>
          </Enter>
        </div>
        <ScrollHint />
      </section>

      <section className="relative flex min-h-screen items-center overflow-hidden px-8 py-28 mobile:px-5">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[0.85fr_1.15fr] items-center gap-20 desktop:grid-cols-1">
          <div>
            <Enter><SceneNumber>One operating system</SceneNumber></Enter>
            <Enter delay={0.1}>
              <h2 className="mt-8 text-6xl font-extrabold leading-[1.02] tracking-[-0.055em] mobile:text-4xl">
                Daily work is<br /><span className="text-slate-500">fragmented.</span>
              </h2>
            </Enter>
            <Enter delay={0.22}>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
                Businesses manage bookings, customer requests, staff coordination, and daily operations across multiple workflows.
              </p>
            </Enter>
          </div>
          <div className="relative min-h-[560px] mobile:min-h-[440px]">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ amount: 0.5 }}
              transition={{ duration: 0.9, delay: 0.45, ease }}
              className="absolute left-1/2 top-1/2 z-10 grid h-44 w-44 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[42px] bg-orange shadow-[0_0_100px_#ff550b55]"
            >
              <Workflow size={66} />
              <span className="absolute -bottom-9 text-sm font-bold">One platform</span>
            </motion.div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} className="absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15 mobile:h-[330px] mobile:w-[330px]" />
            <FlowCard icon={CalendarDays} title="Bookings" position="left-0 top-16" delay={0.05} />
            <FlowCard icon={MessageSquareText} title="Customer requests" position="right-0 top-20" delay={0.14} />
            <FlowCard icon={Users} title="Staff coordination" position="bottom-16 left-2" delay={0.23} />
            <FlowCard icon={Zap} title="Daily operations" position="bottom-12 right-0" delay={0.32} />
          </div>
        </div>
        <ScrollHint />
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 py-28 mobile:px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#2563eb16,transparent_44%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <Enter><SceneNumber>The difference</SceneNumber></Enter>
          <Enter delay={0.1}>
            <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-5 rounded-[28px] border border-red-400/20 bg-red-500/[0.06] px-8 py-6 text-slate-500">
              <Bot size={35} /><span className="text-2xl font-bold line-through decoration-red-400/70">Another chatbot</span>
            </div>
          </Enter>
          <Enter delay={0.28}>
            <h2 className="mt-10 text-[clamp(3rem,6.5vw,6.5rem)] font-extrabold leading-[0.98] tracking-[-0.06em]">
              AI that can actually<br /><span className="text-orange">work for a business.</span>
            </h2>
          </Enter>
          <Enter delay={0.45}>
            <div className="mx-auto mt-11 flex max-w-3xl items-center gap-5 rounded-[28px] border border-emerald-400/25 bg-emerald-500/[0.07] p-7 text-left">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-[#062317]"><ShieldCheck size={29} /></span>
              <div>
                <p className="text-xl font-bold">Without putting that business at risk.</p>
                <p className="mt-1 text-sm text-slate-400">Authorized actions. Enforced boundaries. Human control.</p>
              </div>
              <CheckCircle2 className="ml-auto text-emerald-400 mobile:hidden" size={30} />
            </div>
          </Enter>
          <Enter delay={0.62}>
            <p className="mt-12 text-[10px] font-bold uppercase tracking-[0.42em] text-slate-600">Now, let me show you how it works</p>
          </Enter>
        </div>
      </section>
    </main>
  );
}
