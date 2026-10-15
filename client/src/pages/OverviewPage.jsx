import React from "react";
import {
  ArrowUpRight,
  Users,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Clock,
  MessageSquare,
} from "lucide-react";
import { TaskPreview, BriefingActivity } from "./components/OverviewHero.jsx";

export default function OverviewPage(props) {
  const {
    data,
    appointments,
    customer,
    staff,
    badge,
    avatar,
    pending,
    action,
    start,
    ask,
    navigate,
    agents,
    busy,
  } = props;
  return (
    <>
      <section className="metrics grid grid-cols-4 gap-[15px] mb-[23px] wide:mb-7 tablet:grid-cols-2 phone:gap-2.5 ![order:1] !gap-[15px] !mb-[21px] compact:!grid-cols-2 mobile:!gap-2.5">
        {[
          {
            label: "Appointments today",
            value: data.appointments.filter(
              (b) =>
                b.date === new Date().toISOString().slice(0, 10) &&
                b.status === "Confirmed",
            ).length,
            detail: "Confirmed on your calendar",
            icon: CalendarDays,
          },
          {
            label: "Customers",
            value: data.customers.length,
            detail: "Connected to your workspace",
            icon: Users,
          },
          {
            label: "Open tasks",
            value: data.tasks.filter((t) => t.status !== "Done").length,
            detail: "Across your team",
            icon: ListTodo,
          },
          {
            label: "Awaiting approval",
            value: pending.length,
            detail: pending.length
              ? "Your decision is needed"
              : "You’re all caught up",
            icon: ShieldCheck,
          },
        ].map((m, i) => (
          <article
            className="metric bg-white border border-border rounded-[9px] pt-[19px] px-5 pb-[17px] [&>div]:flex [&>div]:justify-between [&>div]:text-[#8a9585] [&>div]:gap-1.5 [&>div>span]:text-tiny [&>div>span]:font-500 [&>div>span]:text-[#7f887d] [&>strong]:font-display [&>strong]:font-600 [&>strong]:text-3xl [&>strong]:tracking-[-1px] [&>strong]:block [&>strong]:mt-3.5 [&>strong]:mx-0 [&>strong]:mb-3 [&>strong]:leading-none [&_small]:text-2xs [&_small]:flex [&_small]:items-center [&_small]:gap-[5px] [&_small]:whitespace-nowrap [&_small_svg]:block wide:p-[25px] desktop:py-[17px] desktop:px-3.5 desktop:[&_small]:whitespace-normal desktop:[&_small]:text-caption phone:py-4 phone:px-3 phone:[&>div>span]:text-2xs phone:[&>div_svg]:w-[15px] phone:[&>strong]:text-[27px] phone:[&_small]:text-micro phone:[&_small]:leading-normal phone:[&_small]:min-h-6 [&>strong]:!font-ui !relative !p-[20px_18px_18px_82px] !min-h-[118px] !rounded-xl !bg-white [&>div]:!contents [&>div>span]:!text-tiny [&>div>span]:!text-[#273753] [&>div>span]:!font-500 [&>div>svg]:!absolute [&>div>svg]:!left-[18px] [&>div>svg]:!top-[19px] [&>div>svg]:!p-[13px] [&>div>svg]:!w-[52px] [&>div>svg]:!h-[52px] [&>div>svg]:!bg-[#fff0de] [&>div>svg]:!text-[#ff640d] [&>div>svg]:!rounded-xl [&:nth-child(2)>div>svg]:!bg-[#e9f0ff] [&:nth-child(2)>div>svg]:!text-[#2674ff] [&:nth-child(3)>div>svg]:!bg-[#e8f5eb] [&:nth-child(3)>div>svg]:!text-[#00863d] [&:nth-child(4)>div>svg]:!bg-[#ffe9eb] [&:nth-child(4)>div>svg]:!text-[#ff3139] [&>strong]:!mt-[7px] [&>strong]:!mx-0 [&>strong]:!mb-[5px] [&>strong]:!text-[31px] [&>strong]:!text-[#0c1832] [&>strong]:!font-750 [&_small]:!text-[#6b7995] [&_small]:!text-2xs [&_small]:!leading-relaxed [&_small]:!whitespace-normal [&_small]:!gap-[5px] [&:after]:![content:'›'] [&:after]:!absolute [&:after]:!right-[17px] [&:after]:!top-[17px] [&:after]:!text-[#4a5976] [&:after]:!text-xl wide:!pt-5 wide:!pb-[18px] wide:[&>div>span]:!text-13 wide:[&_small]:!text-tiny laptop:!p-[19px_13px_16px_65px] laptop:[&>div>svg]:!w-10 laptop:[&>div>svg]:!h-10 laptop:[&>div>svg]:!left-3.5 laptop:[&>div>svg]:!p-2.5 laptop:[&>div>span]:!text-2xs laptop:[&_small]:!text-caption compact:!min-h-[106px] compact:!pl-[78px] compact:[&>div>svg]:!w-12 compact:[&>div>svg]:!h-12 compact:[&>div>svg]:!p-3 compact:[&>div>svg]:!left-4 compact:[&>div>span]:!text-xs compact:[&_small]:!text-2xs mobile:!py-3.5 mobile:!px-[11px] mobile:!min-h-[136px] mobile:[&>div>svg]:!static mobile:[&>div>svg]:!block mobile:[&>div>svg]:!h-8 mobile:[&>div>svg]:!w-8 mobile:[&>div>svg]:!p-[7px] mobile:[&>div>svg]:!rounded-lg mobile:[&>div>svg]:!mb-[9px] mobile:[&>div]:!flex mobile:[&>div]:!flex-col-reverse mobile:[&>div]:!gap-0 mobile:[&>div>span]:!text-2xs mobile:[&>strong]:!mt-[7px] mobile:[&>strong]:!mx-0 mobile:[&>strong]:!mb-1 mobile:[&>strong]:!text-[25px] mobile:[&_small]:!text-micro mobile:[&_small]:!min-h-0 mobile:[&:after]:!right-3 mobile:[&:after]:!top-3"
            key={m.label}
          >
            <div>
              <span>{m.label}</span>
              <m.icon size={18} />
            </div>
            <strong>{String(m.value).padStart(2, "0")}</strong>
            <small>
              <span
                className={
                  i === 3 && pending.length
                    ? "amber-text text-[#b3985b] !text-[#ff3f3f]"
                    : "green-text text-[#8ba96c] !text-[#0e9c5b]"
                }
              >
                {i === 3 ? <Clock size={13} /> : <ArrowUpRight size={13} />}
              </span>
              {m.detail}
            </small>
          </article>
        ))}
      </section>
      <div className="overview-grid grid [grid-template-columns:1.5fr_1fr] gap-[22px] desktop:[grid-template-columns:1.2fr_1fr] desktop:gap-4 tablet:[grid-template-columns:1fr] ![order:2] ![grid-template-columns:1.65fr_1fr] !gap-[18px] compact:![grid-template-columns:1fr]">
        <section className="briefing bg-[#f0f4e8] relative overflow-hidden py-[22px] px-6 [&>*:not(.orbit)]:relative [&>*:not(.orbit)]:z-[1] [&_.section-title]:text-[#657a50] [&_.section-title]:text-tiny [&_h2]:text-[29px] [&_h2]:font-600 [&_h2]:leading-[1.28] [&_h2]:tracking-[-1px] [&_h2]:mt-6 [&_h2]:mx-0 [&_h2]:mb-3 [&_h2]:text-[#354d2f] [&>p]:max-w-[350px] [&>p]:text-tiny [&>p]:leading-loose [&>p]:text-[#8a957e] wide:p-7 wide:[&_h2]:text-[34px] tablet:[&_h2]:text-3xl phone:[&_h2]:text-[29px] !min-h-[258px] !bg-[linear-gradient(115deg,#fff2e4_0%,#ffecdc_60%,#ffe5d0_100%)] !border !border-[#ffeddd] !py-6 !px-7 [&_.section-heading]:!max-w-[59%] [&_.section-title]:!uppercase [&_.section-title]:!text-orange [&_.section-title]:!text-2xs [&_.section-title]:!font-600 [&_.section-title]:!gap-[9px] [&_.pill]:!hidden [&_h2]:!text-[31px] [&_h2]:!leading-[1.12] [&_h2]:!font-750 [&_h2]:!text-[#10203b] [&_h2]:!tracking-[-1.1px] [&_h2]:!mt-4 [&_h2]:!mx-0 [&_h2]:!mb-[11px] [&_h2]:!max-w-[62%] [&_h2>span]:!text-orange [&>p]:!text-[#42516c] [&>p]:!text-xs [&>p]:!leading-[1.65] [&>p]:!max-w-[57%] [&_.briefing-activity]:!absolute [&_.briefing-activity]:!right-[27px] [&_.briefing-activity]:!top-[53px] [&_.briefing-activity]:!z-[2] [&_.briefing-activity]:!w-[210px] [&_.briefing-activity]:!grid [&_.briefing-activity]:!gap-[11px] wide:!min-h-[268px] wide:!py-[25px] wide:!px-[30px] wide:[&_h2]:!text-[34px] wide:[&>p]:!text-sm wide:[&_.briefing-activity]:!w-[230px] wide:[&_.briefing-activity]:!right-[51px] wide:[&_.briefing-activity]:!top-11 laptop:!p-[22px] laptop:[&_.briefing-activity]:!right-[25px] laptop:[&_.briefing-activity]:!w-[170px] laptop:[&_.briefing-activity]:!top-[58px] laptop:[&_h2]:!text-[27px] laptop:[&>p]:!text-tiny compact:[&_.briefing-activity]:!w-[210px] compact:[&_.briefing-activity]:!right-9 compact:[&_.briefing-activity]:!top-11 compact:[&>p]:!text-xs compact:[&_h2]:!text-3xl mobile:!p-[21px] mobile:!min-h-0 mobile:[&_.section-heading]:!max-w-full mobile:[&_h2]:!max-w-full mobile:[&>p]:!max-w-full mobile:[&_h2]:!text-[29px] mobile:[&_.briefing-activity]:!relative mobile:[&_.briefing-activity]:!top-[auto] mobile:[&_.briefing-activity]:!right-[auto] mobile:[&_.briefing-activity]:!w-full mobile:[&_.briefing-activity]:![grid-template-columns:1fr] mobile:[&_.briefing-activity]:!gap-2 mobile:[&_.briefing-activity]:!mt-[23px] card bg-white border border-border rounded-[9px] p-[22px] min-w-0 phone:p-[18px] !rounded-xl !p-[21px] !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-[18px]">
          <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
            <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
              <span className="sparkle-icon inline-flex items-center justify-center text-[#759554] !text-orange">
                <Sparkles size={17} />
              </span>
              Your operations brief
            </span>
            <span className="pill text-micro tracking-[.7px] font-600 text-[#9ba393] border border-[#e7ebdf] rounded-sm py-[5px] px-1.5 whitespace-nowrap phone:text-[6px] phone:whitespace-normal phone:text-right phone:max-w-[145px] !bg-[#fff2e7] !text-[#6c6470] ![border:none] !rounded-md !text-micro">
              {data.integration.mode === "live"
                ? "LIVE WORKSPACE"
                : "SANDBOX WORKSPACE"}
            </span>
          </div>
          <h2>
            More momentum.
            <br />
            <span>Less managing.</span>
          </h2>
          <p>
            {pending.length
              ? `You have ${pending.length} compensation request to review. Your team has ${data.tasks.filter((t) => t.status !== "Done").length} open tasks.`
              : "Your workspace is ready. Put OperIQ to work on a customer enquiry, a schedule disruption, or a service issue."}
          </p>
          <div className="briefing-bottom mt-6 pt-3.5 border-t border-[#dfe6d4] flex items-center justify-between gap-2.5 [&>span]:text-micro [&>span]:text-[#8d9b7c] [&>span]:flex [&>span]:items-center [&>span]:gap-[5px] [&_button]:bg-transparent [&_button]:text-[#5b7843] [&_button]:flex [&_button]:gap-[7px] [&_button]:items-center [&_button]:text-2xs [&_button]:font-600 [&_button]:p-0 [&_button]:whitespace-nowrap desktop:[align-items:start] desktop:flex-col desktop:gap-3 tablet:flex-row tablet:items-center phone:flex-col phone:[align-items:start] ![border:none] !p-0 !mt-3.5 ![align-items:start] !flex-col-reverse !gap-2.5 [&_button]:!bg-orange [&_button]:!text-white [&_button]:!text-xs [&_button]:!gap-[9px] [&_button]:!py-[13px] [&_button]:!px-[19px] [&_button]:!rounded-[9px] [&>span]:!text-micro [&>span]:!text-[#93715c] [&_.status-dot]:!bg-orange tablet:!flex-col-reverse tablet:![align-items:start]">
            <span>
              <span className="status-dot [display:inline-block] w-[5px] h-[5px] [flex-shrink:0] bg-[#8aa96b] rounded-full !bg-[#00a35b]" />{" "}
              {data.integration.mode === "live"
                ? "Live services configured"
                : "Sandbox · no external messages or payments"}
            </span>
            <button onClick={() => ask("")}>
              <Sparkles size={16} />
              Ask OperIQ
            </button>
          </div>
          <BriefingActivity data={data} />
          <div className="orbit border border-[#dce7cd] rounded-full absolute w-24 h-24 right-0 top-12 [transform:rotate(-25deg)] !border-[#ffddbd] !top-24 !right-0 !opacity-50 orbit-one w-24 right-0" />
          <div className="orbit border border-[#dce7cd] rounded-full absolute w-24 h-24 right-0 top-12 [transform:rotate(-25deg)] !border-[#ffddbd] !top-24 !right-0 !opacity-50 orbit-two w-24 right-0 shadow-[0_0_0_27px_#e8efde55] !shadow-[0_0_0_27px_#ffe3ca66]" />
        </section>
        <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4 attention py-5 px-5 flex flex-col">
          <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
            <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
              Needs your attention
            </span>
            <span className="count bg-[#f1f4ec] text-[#839476] text-2xs rounded-[5px] py-[3px] px-[7px] font-500 !bg-[#fff0e0] !text-[#ee590d] !rounded-md">
              {pending.length +
                data.complaints.filter((c) => c.status === "Open").length}
            </span>
          </div>
          {pending.slice(0, 2).map((a) => (
            <button
              className="attention-row py-4 px-0 border-b border-[#eef0e9] flex items-center gap-3 bg-transparent text-left w-full text-[#687660] [&>span:nth-child(2)]:[flex:1] [&_strong]:text-[#505c4b] [&_strong]:text-tiny [&_strong]:block [&_small]:text-2xs [&_small]:mt-1.5 tablet:py-3 tablet:px-0 !text-[#536482] !border-[#eef0f5] !py-[13px] !px-0 [&_strong]:!text-navy [&_strong]:!text-xs [&_small]:!text-tiny [&_small]:!text-[#75819a] [&_small]:!mt-[5px]"
              key={a.id}
              onClick={() => navigate("Approvals")}
            >
              <span className="attention-icon w-9 h-9 rounded-lg inline-flex items-center justify-center [flex-shrink:0] !rounded-xl peach bg-[#faece1] text-[#b98c66] !bg-[#fff0df] !text-[#ff640d]">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>Compensation approval</strong>
                <small>
                  {customer(a.customerId)?.name} · ₹{a.amount}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
          {data.complaints
            .filter((c) => c.status === "Open")
            .slice(0, 2)
            .map((c) => (
              <button
                className="attention-row py-4 px-0 border-b border-[#eef0e9] flex items-center gap-3 bg-transparent text-left w-full text-[#687660] [&>span:nth-child(2)]:[flex:1] [&_strong]:text-[#505c4b] [&_strong]:text-tiny [&_strong]:block [&_small]:text-2xs [&_small]:mt-1.5 tablet:py-3 tablet:px-0 !text-[#536482] !border-[#eef0f5] !py-[13px] !px-0 [&_strong]:!text-navy [&_strong]:!text-xs [&_small]:!text-tiny [&_small]:!text-[#75819a] [&_small]:!mt-[5px]"
                key={c.id}
                onClick={() => start("complaint")}
              >
                <span className="attention-icon w-9 h-9 rounded-lg inline-flex items-center justify-center [flex-shrink:0] !rounded-xl lavender bg-[#eeeaf6] text-[#8876a8] !bg-[#f0e7ff] !text-[#7b35f5]">
                  <MessageSquare size={18} />
                </span>
                <span>
                  <strong>Customer follow-up</strong>
                  <small>{customer(c.customerId)?.name} · Open complaint</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          {!pending.length && !data.complaints.some((complaint) => complaint.status === "Open") && (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#e9f7ef] text-[#07925d]"><ShieldCheck size={21}/></span>
              <strong className="text-sm text-navy">Nothing needs your attention</strong>
              <p className="mt-2 max-w-[280px] text-xs leading-5 text-[#7b879a]">Approvals and service issues that need your review will appear here.</p>
            </div>
          )}
          <div className="attention-footer mt-[auto] pt-[22px] flex items-center gap-[7px] text-[#a4ab9c] text-caption tablet:pt-[15px] !text-[#8692a7] !text-2xs">
            <ShieldCheck size={14} />
            Important decisions stay with you.
          </div>
        </section>
      </div>
      <section className="workflows mt-8 ![order:4] !mt-7">
        <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
          <div>
            <h3>What can we take off your plate?</h3>
            <p>One request. Coordinated action across your business.</p>
          </div>
          <span className="muted text-[#9ba391] text-caption tracking-[1px] !text-[#8a95ab]">
            WORKFLOWS
          </span>
        </div>
        <div className="workflow-grid grid grid-cols-3 gap-[17px] tablet:grid-cols-2 tablet:gap-2.5 mobile:grid-cols-1">
          {[
            {
              id: "enquiry",
              title: "Turn enquiries into bookings",
              text: "Find a fit, prepare a reply, and propose an appointment.",
              icon: CalendarDays,
              color: "mint",
            },
            {
              id: "absence",
              title: "Keep the day moving",
              text: "Coordinate coverage when your team’s plans change.",
              icon: Users,
              color: "lavender",
            },
            {
              id: "complaint",
              title: "Make things right",
              text: "Follow up on feedback and bring exceptions to you.",
              icon: MessageSquare,
              color: "peach",
            },
          ].map((w) => (
            <button
              className="workflow-card p-5 text-left bg-white border border-border rounded-[9px] text-[#354b36] [&:hover]:shadow-[0_5px_20px_#263d2c09] [&:hover]:[transform:translateY(-2px)] [&_h4]:text-xs [&_h4]:font-650 [&_h4]:tracking-[-.15px] [&_p]:text-2xs [&_p]:leading-loose [&_p]:text-[#969d8e] [&_p]:mt-2 [&_p]:max-w-[230px] [&_p]:min-h-[37px] wide:p-[25px] wide:[&_p]:text-xs wide:[&_h4]:text-sm desktop:p-4 tablet:[&_h4]:text-tiny tablet:[&_p]:text-2xs phone:relative phone:p-[18px_18px_18px_72px] phone:[&_h4]:text-13 phone:[&_p]:text-tiny phone:[&_p]:max-w-[none] phone:[&_p]:min-h-0 !border-border !rounded-xl !text-navy [&_h4]:!text-13 [&_p]:!text-[#71809b] [&_p]:!text-xs tablet:[&_p]:!text-tiny mobile:!pl-18 mobile:[&_h4]:!text-xs"
              key={w.id}
              onClick={() => start(w.id)}
            >
              <span
                className={`workflow-icon h-9 w-9 rounded-lg grid place-items-center mb-[19px] phone:absolute phone:left-4 phone:top-5 !rounded-xl ${w.color === "mint" ? "mint bg-[#eaf0e1] text-[#7e9869] !bg-[#e9f5eb] !text-[#00843c]" : w.color === "lavender" ? "lavender bg-[#eeeaf6] text-[#8876a8] !bg-[#f0e7ff] !text-[#7b35f5]" : w.color === "peach" ? "peach bg-[#faece1] text-[#b98c66] !bg-[#fff0df] !text-[#ff640d]" : ""}`}
              >
                <w.icon size={21} />
              </span>
              <h4>{w.title}</h4>
              <p>{w.text}</p>
              <span className="workflow-link flex items-center justify-between border-t border-[#eff1e9] mt-[19px] pt-3.5 text-2xs text-[#839174] phone:mt-3 phone:pt-2.5 !text-orange !border-[#edf0f5] !text-tiny">
                Start workflow <ArrowUpRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="bottom-grid grid [grid-template-columns:1.5fr_1fr] gap-[22px] mt-[25px] desktop:[grid-template-columns:1.2fr_1fr] desktop:gap-4 tablet:[grid-template-columns:1fr] ![order:3] ![grid-template-columns:1.15fr_1fr_1fr] !gap-[17px] !mt-5 ![align-items:stretch] [&_.card]:!p-[19px] [&_.section-title]:!text-13 wide:[&_.section-title]:!text-[15px] laptop:![grid-template-columns:1.2fr_1fr] laptop:[&>.card:last-child]:![grid-column:1_/_-1] laptop:[&>.card:last-child]:!grid laptop:[&>.card:last-child]:!grid-cols-2 laptop:[&>.card:last-child]:![column-gap:24px] laptop:[&>.card:last-child_.section-heading]:![grid-column:1_/_-1] tablet:![grid-template-columns:1fr_1fr] mobile:![grid-template-columns:1fr] mobile:[&>.card:last-child]:!block mobile:[&_.section-title]:!text-sm">
        <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
          <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
            <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
              Upcoming schedule
            </span>
            <button
              className="text-button inline-flex items-center gap-1.5 bg-transparent p-0 text-[#829274] text-2xs whitespace-nowrap !text-[#f4510c] !text-tiny"
              onClick={() => navigate("Schedule")}
            >
              View schedule <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="">
            {!appointments.length && <div className="py-8 text-center"><CalendarDays className="mx-auto mb-3 text-[#aab4c5]" size={24}/><strong className="block text-sm text-navy">No upcoming appointments</strong><p className="mx-auto mt-2 max-w-[270px] text-xs leading-5 text-[#7b879a]">Scheduled and proposed appointments will appear here.</p></div>}
            {appointments.slice(0, 4).map((b) => (
              <div
                className="schedule-row flex items-center gap-3 py-3.5 px-0 border-t border-[#f0f2eb] [&_.time]:text-2xs [&_.time]:text-[#959e8d] [&_.time]:w-[38px] [&>div]:[flex:1] [&_strong]:block [&_strong]:text-2xs [&_small]:text-caption [&_small]:mt-[5px] wide:py-[18px] wide:px-0 desktop:gap-2 desktop:[&_.badge]:hidden tablet:[&_.badge]:inline-flex phone:flex-wrap phone:gap-[7px] phone:[&_.avatar]:w-7 phone:[&_.avatar]:h-7 phone:[&_.avatar]:text-caption phone:[&_.badge]:text-[7px] phone:[&_.badge]:p-1 phone:[&_.time]:w-[31px] phone:[&_.time]:text-caption phone:[&_strong]:text-caption phone:[&_small]:text-micro !gap-2.5 !py-[13px] !px-0 !border-[#f0f1f5] [&_strong]:!text-navy [&_strong]:!text-2xs [&_small]:!text-[#73809b] [&_small]:!text-caption [&_.time]:!text-[#6e7b97] [&_.time]:!text-2xs [&_.time]:!w-[31px] [&_.avatar]:!w-8 [&_.avatar]:!h-8 [&:nth-child(2)_.schedule-line:before]:!bg-[#3980ff] [&:nth-child(4)_.schedule-line:before]:!bg-[#adb6c6] wide:[&_strong]:!text-xs wide:[&_small]:!text-tiny laptop:[&_.badge]:!inline-flex mobile:[&_strong]:!text-tiny mobile:[&_small]:!text-caption mobile:[&_.badge]:!text-micro mobile:[&_.badge]:!p-[5px]"
                key={b.id}
              >
                <span className="time">{b.time}</span>
                <span className="schedule-line h-[27px] w-0.5 bg-[#d8e3c9] mr-0.5 rounded-[3px] !relative !bg-[#edf0f4] !w-px !h-[34px] [&:before]:![content:''] [&:before]:!bg-orange [&:before]:!w-[7px] [&:before]:!h-[7px] [&:before]:!rounded-full [&:before]:!absolute [&:before]:!left-[-3px] [&:before]:!top-1.5" />
                {avatar(customer(b.customerId))}
                <div>
                  <strong>{customer(b.customerId)?.name}</strong>
                  <small>
                    {b.service} · {staff(b.staffId)?.name}
                  </small>
                </div>
                {badge(b.status)}
              </div>
            ))}
          </div>
        </section>
        <TaskPreview
          tasks={data.tasks}
          staff={data.staff}
          onViewAll={() => navigate("Team & tasks")}
          onToggle={(task) =>
            action(
              `/tasks/${task.id}`,
              {
                status: task.status === "Done" ? "To do" : "Done",
              },
              "PATCH",
            )
          }
        />
        <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
          <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
            <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
              Your AI team
            </span>
            <span className="pill text-micro tracking-[.7px] font-600 text-[#9ba393] border border-[#e7ebdf] rounded-sm py-[5px] px-1.5 whitespace-nowrap phone:text-[6px] phone:whitespace-normal phone:text-right phone:max-w-[145px] !bg-[#fff2e7] !text-[#6c6470] ![border:none] !rounded-md !text-micro">
              4 SPECIALISTS
            </span>
          </div>
          {agents.map((a) => (
            <div
              className="agent-row flex items-center gap-[11px] py-3 px-0 border-t border-[#f0f2eb] [&>div]:[flex:1] [&_strong]:block [&_strong]:text-2xs [&_small]:text-caption [&_small]:mt-1 [&_.attention-icon]:w-[30px] [&_.attention-icon]:h-[30px] [&_.attention-icon]:rounded-[7px] wide:py-4 wide:px-0 !border-[#eef0f5] !gap-3 !py-3 !px-0 [&_strong]:!text-navy [&_strong]:!text-tiny [&_small]:!text-[#76829b] [&_small]:!text-2xs [&_.attention-icon]:!w-[34px] [&_.attention-icon]:!h-[34px] [&_.attention-icon]:!rounded-[9px] wide:[&_strong]:!text-xs wide:[&_small]:!text-tiny"
              key={a.name}
            >
              <span
                className={`attention-icon w-9 h-9 rounded-lg inline-flex items-center justify-center [flex-shrink:0] !rounded-xl ${a.color === "mint" ? "mint bg-[#eaf0e1] text-[#7e9869] !bg-[#e9f5eb] !text-[#00843c]" : a.color === "lavender" ? "lavender bg-[#eeeaf6] text-[#8876a8] !bg-[#f0e7ff] !text-[#7b35f5]" : a.color === "peach" ? "peach bg-[#faece1] text-[#b98c66] !bg-[#fff0df] !text-[#ff640d]" : ""}`}
              >
                <a.icon size={18} />
              </span>
              <div>
                <strong>{a.name}</strong>
                <small>{a.role}</small>
              </div>
              <span className="agent-ready flex items-center gap-[5px] text-micro text-[#91a27c] [&:before]:[content:''] [&:before]:w-1 [&:before]:h-1 [&:before]:bg-[#95b170] [&:before]:rounded-full !text-[#687792] !text-caption [&:before]:!bg-[#00a35b] [&:before]:!w-[5px] [&:before]:!h-[5px]">
                {busy ? "Working" : "Ready"}
              </span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
