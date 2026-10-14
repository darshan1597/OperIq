import { CalendarDays, Command, MessageSquare, ShieldCheck } from "lucide-react";

export const prompts = {
  enquiry:
    "Review the current customer enquiries, identify an available staff member, and prepare the appropriate follow-up.",
  absence:
    "Coordinate coverage for an unavailable staff member and prepare alternative arrangements for affected customers. Do not change confirmed bookings without customer consent.",
  complaint:
    "Review an open customer complaint, prepare a response, assign a follow-up task, and request approval for any proposed compensation.",
  access:
    "Invite the listed email addresses to this workspace. Respect any roles I specify. For emails without a role, balance manager, receptionist, and staff counts as evenly as possible. Never assign owner access.",
  conflict:
    "Inspect the current schedule for overlapping appointments or unavailable assigned staff. Suggest the safest valid alternative and prepare one resolution for owner approval. Do not change any booking yet.",
};

export const routeByPage = {
  Overview: "/app",
  Customers: "/app/customers",
  Schedule: "/app/schedule",
  "Team & tasks": "/app/team-tasks",
  Conversations: "/app/conversations",
  Approvals: "/app/approvals",
  "Agent activity": "/app/agent-activity",
  Profile: "/app/profile",
  "Teach your AI": "/app/ai-setup",
  "Team access": "/app/access",
};

export const agents = [
  { name: "Coordinator", role: "Plans & delegates", icon: Command, color: "lavender" },
  { name: "Customer agent", role: "Conversations & follow-ups", icon: MessageSquare, color: "peach" },
  { name: "Operations agent", role: "Schedules & staff tasks", icon: CalendarDays, color: "mint" },
  { name: "Resolution agent", role: "Complaints & exceptions", icon: ShieldCheck, color: "blue" },
];

export const pageDescriptions = {
  Customers: "People, preferences, and the context that matters.",
  Schedule: "Keep your team and your customers in sync.",
  "Team & tasks": "The right work, with the right people.",
  Conversations: "Thoughtful customer communication, ready for your review.",
  Approvals: "You make the decisions that need a human.",
  "Agent activity": "Every request, decision, and outcome in one place.",
  "Teach your AI": "Add your knowledge, define its boundaries, and publish it for customers.",
  "Team access": "Control who can enter this workspace and what each person can do.",
  Profile: "Manage your account and business identity.",
};

export const badge = (text) => {
  const tone = /Blocked|Failed|Rejected|Unavailable|Expired/.test(text)
    ? "bg-[#ffe9eb] text-[#e83f4c]"
    : /Confirmed|Completed|Active|Approved|Available|Done|Reviewed/.test(text)
      ? "bg-[#e7f5ec] text-[#087344]"
      : /Pending|Awaiting|Follow-up|Held|Processing/.test(text)
        ? "bg-[#fff0de] text-[#d35009]"
        : "bg-[#eff1f5] text-[#586780]";
  return <span className={`badge inline-flex items-center rounded-md py-1.5 px-2 text-caption whitespace-nowrap font-500 ${tone}`}>{text}</span>;
};

export const avatar = (person) => {
  const tone = person?.color === "lavender"
    ? "bg-[#f0e7ff] text-[#7b35f5]"
    : person?.color === "peach"
      ? "bg-[#fff0df] text-[#ff640d]"
      : "bg-[#e9f5eb] text-[#00843c]";
  return <span className={`avatar w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center font-600 text-2xs ${tone}`}>{person?.initials || "OD"}</span>;
};

export const dashboardClassName = (page) =>
  `app [&_button]:[font:inherit] [&_input]:[font:inherit] [&_textarea]:[font:inherit] [&_select]:[font:inherit] [&_button]:[-webkit-tap-highlight-color:transparent] [&_a]:[-webkit-tap-highlight-color:transparent] [&_input]:[-webkit-tap-highlight-color:transparent] [&_textarea]:[-webkit-tap-highlight-color:transparent] [&_select]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer [&_button]:[transition:background_.18s,transform_.18s,box-shadow_.18s] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-60 [&_button:focus-visible]:[outline:3px_solid_#9fc36f] [&_button:focus-visible]:[outline-offset:4px] [&_a:focus-visible]:[outline:3px_solid_#9fc36f] [&_a:focus-visible]:[outline-offset:4px] [&_button:hover:not(:disabled)]:[filter:brightness(.97)] [&_a]:text-[inherit] [&_a]:[text-decoration:none] [&_button]:[border:0] [&_button_svg]:[flex-shrink:0] [&_input]:[outline:none] [&_textarea]:[outline:none] [&_select]:[outline:none] [&_input:focus]:!border-[#86a67a] [&_input:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_textarea:focus]:!border-[#86a67a] [&_textarea:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_select:focus]:!border-[#86a67a] [&_select:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_p]:m-0 [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h4]:font-display [&_strong]:font-600 [&_small]:block [&_small]:text-muted [&_small]:text-xs flex min-h-screen [&_nav]:flex [&_nav]:flex-col [&_nav]:gap-1.5 [&_nav_button]:h-11 [&_nav_button]:flex [&_nav_button]:items-center [&_nav_button]:gap-3 [&_nav_button]:bg-[none] [&_nav_button]:text-[#7b847e] [&_nav_button]:rounded-lg [&_nav_button]:py-0 [&_nav_button]:px-[13px] [&_nav_button]:text-left [&_nav_button]:text-xs [&_nav_button]:font-500 [&_nav_button.active]:bg-[#eaf1e4] [&_nav_button.active]:text-[#284734] [&_nav_button.active]:font-650 [&_nav_button.active:before]:[content:''] [&_nav_button.active:before]:absolute [&_nav_button.active:before]:left-0 [&_nav_button.active:before]:w-0.5 [&_nav_button.active:before]:h-6 [&_nav_button.active:before]:bg-[#6b8c4d] [&_nav_button.active:before]:rounded-[0_2px_2px_0] [&_nav_button:nth-last-child(1)]:mt-[21px] [&_main]:ml-[238px] [&_main]:[flex:1] [&_main]:min-w-0 [&_footer]:flex [&_footer]:justify-between [&_footer]:py-[25px] [&_footer]:px-0 [&_footer]:text-caption [&_footer]:text-[#a6ae9e] [&_footer]:gap-3.5 [&_footer>span:first-child]:flex [&_footer>span:first-child]:items-center [&_footer>span:first-child]:gap-1.5 [&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-xs [&_th]:uppercase [&_th]:font-500 [&_th]:text-caption [&_th]:tracking-[.7px] [&_th]:text-[#99a18f] [&_th]:py-3.5 [&_th]:px-3 [&_th]:bg-[#fafbf7] [&_td]:py-4 [&_td]:px-3 [&_td]:border-t [&_td]:border-[#edf0e7] [&_td]:text-[#78836f] [&_td_small]:mt-[5px] [&_td_small]:text-2xs [&_select]:border [&_select]:border-[#e3e9da] [&_select]:rounded-md [&_select]:bg-[#fafcf6] [&_select]:text-[#758b62] [&_select]:text-tiny [&_select]:p-2 [&_select]:max-w-full [&_to]:[transform:rotate(360deg)] desktop:[&_main]:ml-[205px] tablet:[&_nav_button]:text-[0] tablet:[&_nav_button]:p-0 tablet:[&_nav_button]:justify-center tablet:[&_nav_button]:gap-0 tablet:[&_nav_button_svg]:w-5 tablet:[&_nav_button_svg]:h-5 tablet:[&_main]:ml-18 phone:[&_footer]:text-micro phone:[&_footer]:leading-loose phone:[&_footer]:flex-col phone:[&_footer]:gap-2 [&_h1]:!font-ui [&_h2]:!font-ui [&_h3]:!font-ui [&_h4]:!font-ui [&_button:focus-visible]:![outline-color:#ffaf80] [&_a:focus-visible]:![outline-color:#ffaf80] [&_input:focus]:!border-[#ff9864] [&_input:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_textarea:focus]:!border-[#ff9864] [&_textarea:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_select:focus]:!border-[#ff9864] [&_select:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_nav]:!gap-1 [&_nav_button]:!h-10 [&_nav_button]:!text-[#40506f] [&_nav_button]:!text-13 [&_nav_button]:!gap-3 [&_nav_button]:!rounded-lg [&_nav_button.active]:!bg-[linear-gradient(90deg,#fff2e7,#fff0e1)] [&_nav_button.active]:!text-orange [&_nav_button.active]:!font-600 [&_nav_button.active:before]:!hidden [&_nav_button:hover:not(.active)]:!bg-[#f6f7fa] [&_nav_button:nth-last-child(1)]:!mt-0 [&_main]:!ml-[250px] [&_footer]:![order:5] [&_footer]:!text-[#94a0b3] [&_footer]:!text-2xs [&_th]:!text-[#71809b] [&_th]:!bg-[#f8f9fc] [&_th]:!text-2xs [&_th]:!py-3.5 [&_th]:!px-3 [&_td]:!text-[#576884] [&_td]:!border-[#edf0f5] [&_td]:!py-5 [&_td]:!px-3 [&_td_strong]:!text-navy [&_small]:!text-[#78849c] [&_select]:!text-[#4b5f80] [&_select]:!bg-[#f8f9fc] [&_select]:!border-[#e3e8f2] [&_select]:!rounded-lg wide:[&_main]:!ml-[260px] laptop:[&_main]:!ml-[220px] tablet:[&_main]:!ml-18 tablet:[&_nav_button]:!text-[0] tablet:[&_nav_button]:!gap-0 tablet:[&_nav_button]:!justify-center mobile:[&_footer]:!text-micro box-border [&_*]:box-border [&_*::before]:box-border [&_*::after]:box-border ${page === "Overview" ? "overview-page [&_.content]:!flex [&_.content]:!flex-col [&_.page-heading]:!hidden" : ""}`;
