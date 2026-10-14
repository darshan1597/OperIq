import { useState } from "react";
import {
  Sparkles,
  Send,
  Search,
  Users,
  CalendarDays,
  ShieldCheck,
  ListTodo,
  Check,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";

export function OverviewHero({ user, onRequest, onWorkflow, canUseAgents = true }) {
  const [request, setRequest] = useState("");
  return (
    <section className="overview-hero ![order:0] !grid ![grid-template-columns:1fr_1.35fr] !gap-[35px] !items-center !mt-0 !mx-0 !mb-[25px] wide:![grid-template-columns:.95fr_1.4fr] wide:!mb-[23px] laptop:![grid-template-columns:1fr_1.1fr] laptop:!gap-5 compact:![grid-template-columns:1fr] compact:!gap-5">
      <div className="hero-copy [&_.greeting]:!text-[#13223e] [&_.greeting]:!text-sm [&_.greeting]:!font-600 [&_.greeting]:!mb-1 [&_h1]:!text-[#09152e] [&_h1]:!text-[clamp(26px,2.3vw,40px)] [&_h1]:!leading-[1.16] [&_h1]:!font-800 [&_h1]:!tracking-[-1.6px] [&_h1_span]:!text-orange [&>p:last-child]:!text-[#64728e] [&>p:last-child]:!text-sm [&>p:last-child]:!leading-[1.55] [&>p:last-child]:!mt-3 wide:[&_h1]:!text-[39px] laptop:[&>p:last-child]:!text-xs compact:[&_h1]:!text-[34px] mobile:[&_h1]:!text-3xl mobile:[&_h1]:!max-w-[330px] mobile:[&_.greeting]:!text-xs mobile:[&>p:last-child]:!text-xs">
        <p className="greeting">
          Hello, {user?.name?.split(" ")[0] || "there"} <span aria-hidden="true">👋</span>
        </p>
        <h1>
          Your business, <span>in motion.</span>
        </h1>
        <p>
          OperIQ coordinates your people, customers and operations —
          <br className="desktop-break mobile:!hidden" /> so you can focus
          on growth.
        </p>
      </div>
      {canUseAgents ? <div className="ask-panel !bg-white !border !border-border !rounded-[13px] !py-3 !px-3.5 [&_form]:!flex [&_form]:!items-center [&_form]:!gap-3.5 [&_form]:!p-[0_0_12px_6px] [&_form]:!border-b [&_form]:!border-[#f0f1f5] [&_form]:!text-orange [&_input]:![flex:1] [&_input]:!min-w-0 [&_input]:!py-2.5 [&_input]:!px-0 [&_input]:![border:none] [&_input]:!text-navy [&_input]:!text-13 [&_input]:!bg-transparent [&_input::placeholder]:!text-[#6c7897] [&_form_button]:!bg-orange [&_form_button]:!text-white [&_form_button]:!rounded-[10px] [&_form_button]:!w-[46px] [&_form_button]:!h-[46px] [&_form_button]:!grid [&_form_button]:!place-items-center mobile:!p-2.5 mobile:[&_form]:!gap-2 mobile:[&_form]:!pl-0 mobile:[&_input]:!text-tiny mobile:[&_form>svg]:!w-[19px] mobile:[&_form_button]:!h-[37px] mobile:[&_form_button]:!w-[37px] mobile:[&_form_button]:!rounded-lg mobile:[&_form_button]:![flex-shrink:0]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onRequest(request.trim());
          }}
        >
          <Sparkles size={23} />
          <input
            aria-label="Ask OperIQ anything"
            placeholder="Ask OperIQ anything…"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
          />
          <button type="submit" aria-label="Prepare an OperIQ request">
            <Send size={20} />
          </button>
        </form>
        <div className="suggested-requests !flex !gap-[7px] !pt-[11px] !flex-wrap [&_button]:!border [&_button]:!border-[#e7ebf3] [&_button]:!rounded-[20px] [&_button]:!bg-[#f8faff] [&_button]:!text-[#243754] [&_button]:!text-2xs [&_button]:!py-[7px] [&_button]:!px-[11px] mobile:!gap-1.5 mobile:[&_button]:!text-caption mobile:[&_button]:!py-[7px] mobile:[&_button]:!px-[9px]">
          <button onClick={() => onWorkflow("absence")}>
            Handle staff absence
          </button>
          <button onClick={() => onWorkflow("enquiry")}>
            Manage appointment enquiries
          </button>
          <button onClick={() => onWorkflow("complaint")}>
            Resolve a complaint
          </button>
        </div>
      </div> : <div className="rounded-2xl border border-[#e3e8f0] bg-white p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-orange">{user.role} access</span><h3 className="mt-2 text-base font-bold text-navy">Your workspace view is ready.</h3><p className="mt-2 text-xs leading-6 text-[#71809b]">You can access the schedules and operational work assigned to your role. Sensitive business controls remain with owners and managers.</p></div>}
    </section>
  );
}

export function GlobalSearch({ data, onNavigate }) {
  const [query, setQuery] = useState("");
  const results = query.trim()
    ? [
        ...data.customers.map((customer) => ({
          id: `customer-${customer.id}`,
          label: customer.name,
          detail: customer.email,
          page: "Customers",
          search: customer.name,
          Icon: Users,
        })),
        ...data.appointments.map((booking) => ({
          id: `booking-${booking.id}`,
          label: `${data.customers.find((c) => c.id === booking.customerId)?.name} · ${booking.time}`,
          detail: `${booking.service} · ${booking.date}`,
          page: "Schedule",
          search: booking.id,
          Icon: CalendarDays,
        })),
        ...data.tasks.map((task) => ({
          id: `task-${task.id}`,
          label: task.title,
          detail: task.status,
          page: "Team & tasks",
          search: "",
          Icon: ListTodo,
        })),
      ]
        .filter((result) =>
          `${result.label} ${result.detail}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <div className="global-search-wrap !relative !w-[clamp(190px,22vw,290px)] !z-[30] compact:!w-[245px] tablet:!mr-[auto] tablet:!w-[min(270px,42vw)] mobile:!w-[auto] mobile:![flex:1] mobile:!min-w-0">
      <label className="global-search !flex !items-center !gap-2.5 !py-[11px] !px-3 !bg-[#eef0f4] !text-[#4b5b79] !rounded-[10px] !border !border-[#e9ebf1] [&_input]:!min-w-0 [&_input]:![flex:1] [&_input]:!w-full [&_input]:!bg-transparent [&_input]:![border:none] [&_input]:!text-tiny [&_input]:!text-navy [&_input::placeholder]:!text-[#6d7892] [&_button]:!bg-transparent [&_button]:!text-[#697794] [&_button]:!p-0 [&_button]:!text-lg mobile:!p-[9px] mobile:!gap-[7px] mobile:[&_input]:!text-2xs">
        <Search size={18} />
        <input
          aria-label="Search customers, bookings, and tasks"
          placeholder="Search customers, bookings…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        )}
      </label>
      {query.trim() && (
        <div
          className="search-results !absolute !top-[calc(100%_+_8px)] !right-0 !w-[max(100%,340px)] !bg-white !border !border-border !shadow-[0_16px_45px_#15244415] !p-[7px] !rounded-xl [&>button]:!flex [&>button]:!items-center [&>button]:!gap-[11px] [&>button]:!w-full [&>button]:!py-[11px] [&>button]:!px-[9px] [&>button]:!bg-transparent [&>button]:!text-left [&>button]:!text-[#4f6080] [&>button]:!rounded-[7px] [&>button:hover]:!bg-[#fff5ed] [&>button>span]:!min-w-0 [&>button>span]:![flex:1] [&_strong]:!block [&_strong]:!text-navy [&_strong]:!text-tiny [&_strong]:![overflow-wrap:anywhere] [&_small]:!text-2xs [&_small]:!mt-1 [&>p]:!text-xs [&>p]:!text-[#6f7c94] [&>p]:!py-4 [&>p]:!px-2.5 mobile:!w-[min(340px,calc(100vw_-_105px))] mobile:!right-[auto] mobile:!left-0"
          role="region"
          aria-label="Search results"
        >
          {results.length ? (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  onNavigate(result.page, result.search);
                  setQuery("");
                }}
              >
                <result.Icon size={17} />
                <span>
                  <strong>{result.label}</strong>
                  <small>{result.detail}</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))
          ) : (
            <p>No matching customers, bookings, or tasks.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskPreview({ tasks, staff, onToggle, onViewAll }) {
  const items = [...tasks]
    .sort((a, b) => Number(a.status === "Done") - Number(b.status === "Done"))
    .slice(0, 4);
  return (
    <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
      <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
        <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
          Your team’s tasks
        </span>
        <button
          className="text-button inline-flex items-center gap-1.5 bg-transparent p-0 text-[#829274] text-2xs whitespace-nowrap !text-[#f4510c] !text-tiny"
          onClick={onViewAll}
        >
          View all <ArrowUpRight size={14} />
        </button>
      </div>
      {items.length ? (
        items.map((task) => (
          <div
            className="preview-task !flex !gap-[11px] ![align-items:start] !border-t !border-[#f0f1f5] !py-[13px] !px-0 [&>div]:![flex:1] [&>div]:!min-w-0 [&_strong]:!block [&_strong]:!text-tiny [&_strong]:!text-navy [&_strong]:!leading-normal [&_small]:!text-[#78849e] [&_small]:!text-2xs [&_small]:!mt-[3px] [&_.badge]:!text-micro [&_.badge]:!py-[5px] [&_.badge]:!px-1.5 wide:[&_strong]:!text-xs wide:[&_small]:!text-tiny"
            key={task.id}
          >
            <button
              className={`task-checkbox !bg-white ![border:1.5px_solid_#a2adc2] !w-4 !h-4 !rounded-sm !grid !place-items-center ![flex-shrink:0] !mt-0.5 !p-0 [&.checked]:!bg-[#00a15a] [&.checked]:!border-[#00a15a] [&.checked]:!text-white ${task.status === "Done" ? "checked" : ""}`}
              role="checkbox"
              aria-checked={task.status === "Done"}
              aria-label={`${task.status === "Done" ? "Reopen" : "Complete"} task: ${task.title}`}
              onClick={() => onToggle(task)}
            >
              {task.status === "Done" && <Check size={13} />}
            </button>
            <div>
              <strong>{task.title}</strong>
              <small>
                {staff.find((person) => person.id === task.assignedTo)?.name ||
                  "Unassigned"}
              </small>
            </div>
            <span
              className={`badge inline-flex items-center rounded-sm py-1 px-1.5 text-caption whitespace-nowrap font-500 !text-caption !font-500 !rounded-md !py-1.5 !px-2 ${task.status === "Done" ? "green bg-[#f0f5e9] text-[#81956b] !bg-[#e7f5ec] !text-[#087344]" : task.status === "In progress" ? "amber bg-[#faf2df] text-[#ac9253] !bg-[#fff0de] !text-[#d35009]" : "neutral bg-[#f2f2ee] text-[#929783] !bg-[#eff1f5] !text-[#586780]"}`}
            >
              {task.status}
            </span>
          </div>
        ))
      ) : (
        <p className="section-description text-[#96a288] text-tiny leading-loose my-[15px] mx-0 !text-[#74829c]">
          No tasks yet. Start a workflow to coordinate your team.
        </p>
      )}
    </section>
  );
}

export function BriefingActivity({ data }) {
  const lastTask = data.tasks.at(-1),
    lastDraft = data.messages.at(-1),
    pending = data.approvals.find((item) => item.status === "Pending");
  const items = [
    {
      Icon: ListTodo,
      color: "mint",
      title: lastTask ? "Team task assigned" : "Team workspace ready",
      detail: lastTask
        ? data.staff.find((s) => s.id === lastTask.assignedTo)?.name
        : "Coordinate staff and tasks",
    },
    {
      Icon: MessageSquare,
      color: "lavender",
      title: lastDraft ? "Customer draft prepared" : "Customer communication",
      detail: lastDraft
        ? data.customers.find((c) => c.id === lastDraft.customerId)?.name
        : "Prepare thoughtful replies",
    },
    {
      Icon: ShieldCheck,
      color: "peach",
      title: pending ? "Approval needed" : "Decisions stay with you",
      detail: pending
        ? `Sandbox compensation · ₹${pending.amount}`
        : "Review business exceptions",
    },
  ];

  return (
    <div className="briefing-activity" aria-label="Workspace highlights">
      {items.map(({ Icon, color, title, detail }, index) => (
        <div
          className="briefing-mini-card !flex !gap-[9px] !items-center !p-[11px] !rounded-xl !bg-[#ffffffed] !shadow-[0_5px_16px_#bf72200a] ![transform:rotate(-3deg)] [&:nth-child(2)]:![transform:translateX(15px)_rotate(-2deg)] [&:nth-child(3)]:![transform:translateX(29px)_rotate(-1deg)] [&_strong]:!block [&_strong]:!text-2xs [&_strong]:!text-navy [&_small]:!text-[#66738c] [&_small]:!text-caption [&_small]:!mt-1 [&_small]:!leading-[1.4] [&_.attention-icon]:!w-[30px] [&_.attention-icon]:!h-[30px] [&_.attention-icon]:!rounded-lg wide:!p-[13px] wide:[&_strong]:!text-tiny wide:[&_small]:!text-2xs laptop:!p-[9px] laptop:!gap-1.5 laptop:[&_strong]:!text-micro laptop:[&_small]:!text-micro compact:!p-[11px] compact:[&_strong]:!text-2xs compact:[&_small]:!text-caption mobile:![transform:none] mobile:[&:nth-child(2)]:![transform:none] mobile:[&:nth-child(3)]:![transform:none] mobile:[&_strong]:!text-tiny mobile:[&_small]:!text-2xs"
          key={title}
        >
          <span
            className={`attention-icon w-9 h-9 rounded-lg inline-flex items-center justify-center [flex-shrink:0] !rounded-xl ${color === "mint" ? "mint bg-[#eaf0e1] text-[#7e9869] !bg-[#e9f5eb] !text-[#00843c]" : color === "lavender" ? "lavender bg-[#eeeaf6] text-[#8876a8] !bg-[#f0e7ff] !text-[#7b35f5]" : color === "peach" ? "peach bg-[#faece1] text-[#b98c66] !bg-[#fff0df] !text-[#ff640d]" : ""}`}
          >
            <Icon size={19} />
          </span>
          <div>
            <strong>{title}</strong>
            <small>{detail}</small>
          </div>
          {index === 0 && (
            <span className="mini-check !grid !place-items-center !bg-[#00a55b] !text-white !w-[17px] !h-[17px] !rounded-full !ml-[auto] ![flex-shrink:0]">
              <Check size={12} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
