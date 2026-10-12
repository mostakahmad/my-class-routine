export const TYPE_META = {
  lecture: { label: "Lecture", reminder: "Lecture" },
  lab: { label: "Lab", reminder: "Lab" },
  counseling: { label: "Counseling", reminder: "Counseling" },
  paper: { label: "Paper", reminder: "Paper work" },
  ielts: { label: "IELTS", reminder: "IELTS" },
  project: { label: "Project", reminder: "Project work" },
  break: { label: "Break", reminder: "Break" },
  personal: { label: "Personal", reminder: "Personal" },
  sleep: { label: "Sleep", reminder: "Sleep" },
};

function block(title, type, start, end, extra = {}) {
  return { title, type, start, end, ...extra };
}

const home = { place: "home" };
const noDesk = { place: "no-desk" };

export const ROUTINE = {
  term: "Fall 2026",
  person: "Sonia Nasrin",
  department: "Sonia Nasrin",
  footerNote:
    "If I am not available at my desk during counselling hour, kindly call me.",
  slotOrder: ["early", "s1", "s2", "s3", "s4", "s5", "s6"],
  slots: {
    early: { id: "early", start: "05:20", end: "08:20", label: "5:20 - 8:20" },
    s1: { id: "s1", start: "08:30", end: "10:00", label: "8:30 - 10:00" },
    s2: { id: "s2", start: "10:00", end: "11:30", label: "10:00 - 11:30" },
    s3: { id: "s3", start: "11:30", end: "13:00", label: "11:30 - 1:00" },
    s4: { id: "s4", start: "13:00", end: "14:30", label: "1:00 - 2:30" },
    s5: { id: "s5", start: "14:30", end: "16:00", label: "2:30 - 4:00" },
    s6: { id: "s6", start: "16:00", end: "17:30", label: "4:00 - 5:30" },
  },
  dayLabels: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  specialDays: {},
  week: {
    // Sunday
    0: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("MIS101", "lecture", "10:00", "11:30", { room: "904", grid: { slot: "s2" } }),
      block("Counselling Hour / OBE work / Quiz Check", "counseling", "11:30", "13:00", {
        grid: { slot: "s3" },
      }),
      block("BATCH 24A DM", "lab", "13:00", "14:30", { room: "702", grid: { slot: "s4" } }),
      block("Lunch and prayer break", "break", "14:30", "16:00", { grid: { slot: "s5" } }),
      block("BATCH 21A OS", "lab", "16:00", "17:30", { room: "702", grid: { slot: "s6" } }),
    ],
    // Monday
    1: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Paper work (no desk)", "paper", "08:30", "17:30", {
        ...noDesk,
        grid: { slot: "s1", span: 6 },
      }),
    ],
    // Tuesday
    2: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("MIS101", "lecture", "08:30", "10:00", { room: "904", grid: { slot: "s1" } }),
      block("MIS101", "lecture", "10:00", "11:30", { room: "904", grid: { slot: "s2" } }),
      block("Counselling Hour / Meeting slot / Quiz check", "counseling", "11:30", "13:00", {
        grid: { slot: "s3" },
      }),
      block("Paper work (no desk)", "paper", "13:00", "16:00", {
        ...noDesk,
        grid: { slot: "s4", span: 2 },
      }),
      block("Paper", "paper", "16:00", "17:30", { grid: { slot: "s6" } }),
    ],
    // Wednesday
    3: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("BATCH 24A DM", "lab", "10:00", "11:30", { room: "704", grid: { slot: "s2" } }),
      block("BATCH 21A OS", "lab", "11:30", "13:00", { room: "703", grid: { slot: "s3" } }),
      block("Counselling Hour / OS lab study / lunch", "counseling", "13:00", "14:30", {
        grid: { slot: "s4" },
      }),
      block("IELTS work (no desk)", "ielts", "14:30", "16:00", {
        ...noDesk,
        grid: { slot: "s5" },
      }),
      block("Paper", "paper", "16:00", "17:30", { grid: { slot: "s6" } }),
    ],
    // Thursday — OS 21A2 ends at 11:00 so it does not overlap IELTS Reading.
    4: [
      block("Paper", "paper", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("BATCH 21A1 OS", "lab", "08:30", "10:00", { room: "615L", grid: { slot: "s1" } }),
      block("BATCH 21A2 OS", "lab", "10:00", "11:00", { room: "615L", grid: { slot: "s2" } }),
      block("Project Hour / IELTS Reading", "ielts", "11:00", "12:00", { grid: { slot: "s3" } }),
      block("Lunch and prayer", "break", "12:00", "12:30", { grid: { slot: "s3" } }),
      block("Paper work (no desk)", "paper", "12:30", "17:30", {
        ...noDesk,
        grid: { slot: "s4", span: 3 },
      }),
    ],
    // Friday
    5: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Project Work at Home", "project", "08:30", "17:30", {
        ...home,
        grid: { slot: "s1", span: 6 },
      }),
    ],
    // Saturday
    6: [
      block("IELTS", "ielts", "05:20", "08:20", { ...home, grid: { slot: "early" } }),
      block("Project Work at Home", "project", "08:30", "17:30", {
        ...home,
        grid: { slot: "s1", span: 6 },
      }),
    ],
  },
  evening: {
    cooking: [
      block("Bath, Prayer, Eat, Food prepare", "personal", "17:30", "20:00", { segment: "evening" }),
      block("Rest", "personal", "20:00", "20:30", { segment: "evening" }),
      block("Prayer", "personal", "20:30", "21:00", { segment: "evening" }),
      block("Exercise & walk", "personal", "21:00", "21:30", { segment: "evening" }),
      block("Go to bed", "personal", "21:30", "22:00", { segment: "evening" }),
      block("Sleep", "sleep", "22:00", "05:00", { segment: "evening" }),
    ],
    nocook: [
      block("Bath, Prayer, Rest & Eat", "personal", "18:00", "19:30", { segment: "evening" }),
      block("IELTS Speaking Practice / test", "ielts", "19:30", "20:30", { segment: "evening" }),
      block("Prayer", "personal", "20:30", "21:00", { segment: "evening" }),
      block("Exercise & walk", "personal", "21:00", "21:30", { segment: "evening" }),
      block("Go to bed", "personal", "21:30", "22:00", { segment: "evening" }),
      block("Sleep", "sleep", "22:00", "05:00", { segment: "evening" }),
    ],
  },
};
