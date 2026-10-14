const presets = {
  salon: {
    match: /salon|spa|beauty|hair|barber/i,
    eyebrow: "Premium care, made personal",
    headline: "Look good.",
    accent: "Feel even better.",
    action: "Book an appointment",
    serviceLabel: "Our services",
    trust: [
      ["Experienced professionals", "Friendly specialists who understand your needs"],
      ["Quality products", "Carefully selected products and treatments"],
      ["Hygienic environment", "A clean, comfortable space for every visit"],
      ["Customer first", "Personal attention from enquiry to follow-up"],
    ],
  },
  repair: {
    match: /repair|technician|electronics|automotive|garage|maintenance/i,
    eyebrow: "Reliable service from skilled technicians",
    headline: "Get it fixed.",
    accent: "Get back to your day.",
    action: "Request a service",
    serviceLabel: "Repair services",
    trust: [
      ["Skilled technicians", "Experienced help for every repair"],
      ["Clear estimates", "Understand the work before it begins"],
      ["Quality parts", "Reliable components and careful workmanship"],
      ["Service updates", "Stay informed throughout the repair"],
    ],
  },
  clinic: {
    match: /clinic|medical|dental|doctor|wellness|therapy|health/i,
    eyebrow: "Professional care you can trust",
    headline: "Your health.",
    accent: "Our priority.",
    action: "Book a consultation",
    serviceLabel: "Care and services",
    trust: [
      ["Qualified professionals", "Care from an experienced team"],
      ["Private and secure", "Your information is handled carefully"],
      ["Clean facilities", "A comfortable and hygienic environment"],
      ["Patient focused", "Clear guidance at every step"],
    ],
  },
  education: {
    match: /tutor|education|academy|coaching|training|class|school/i,
    eyebrow: "Learning designed around every student",
    headline: "Learn with confidence.",
    accent: "Grow with guidance.",
    action: "Book a session",
    serviceLabel: "Courses and sessions",
    trust: [
      ["Experienced educators", "Learn with supportive subject experts"],
      ["Personal attention", "Guidance shaped around each learner"],
      ["Flexible sessions", "Choose times that work for you"],
      ["Progress focused", "Clear goals and consistent feedback"],
    ],
  },
  fitness: {
    match: /gym|fitness|yoga|pilates|trainer|sports/i,
    eyebrow: "Training that fits your goals",
    headline: "Move stronger.",
    accent: "Feel your best.",
    action: "Book a session",
    serviceLabel: "Classes and programmes",
    trust: [
      ["Expert coaches", "Guidance from experienced professionals"],
      ["Goal based plans", "Training shaped around your objectives"],
      ["Quality equipment", "A safe, well maintained environment"],
      ["Supportive community", "Encouragement at every stage"],
    ],
  },
  general: {
    match: /.*/,
    eyebrow: "Professional service, made simple",
    headline: "The help you need.",
    accent: "Right when you need it.",
    action: "Get started",
    serviceLabel: "Our services",
    trust: [
      ["Experienced team", "Helpful professionals you can rely on"],
      ["Clear communication", "Straightforward answers and updates"],
      ["Convenient service", "Simple enquiries and scheduling"],
      ["Customer first", "Support built around your needs"],
    ],
  },
};

export function getPortalPreset(industry = "") {
  return Object.values(presets).find((preset) => preset.match.test(industry)) || presets.general;
}
