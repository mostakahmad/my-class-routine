const ROUTINE = {
  term: "Summer 2026",
  department: "Department of CIS",
  footerNote:
    "If I am not available in my desk during Counseling hour, kindly call me.",
  slots: {
    s1: { id: "s1", start: "08:30", end: "10:00", label: "8:30 - 10:00" },
    s2: { id: "s2", start: "10:00", end: "11:30", label: "10:00 - 11:30" },
    s3: { id: "s3", start: "11:30", end: "13:00", label: "11:30 - 1:00" },
    s4: { id: "s4", start: "13:00", end: "14:30", label: "1:00 - 2:30" },
    s5: { id: "s5", start: "14:30", end: "16:00", label: "2:30 - 4:00" },
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
  specialDays: {
    5: { type: "holiday", label: "HOLIDAY" },
    6: { type: "dayoff", label: "DAY OFF" },
  },
  week: {
    0: [
      { slot: "s2", title: "MIS101" },
      { slot: "s3", title: "COUNSELING HOUR" },
      { slot: "s4", title: "DM 23B", room: "702" },
      { slot: "s5", title: "DM 23A", room: "702" },
    ],
    1: [
      { slot: "s2", title: "COUNSELING HOUR" },
      { slot: "s3", title: "MIS101" },
      { slot: "s5", title: "COUNSELING HOUR" },
    ],
    2: [
      { slot: "s1", title: "MIS101" },
      { slot: "s2", title: "MIS101" },
      { slot: "s3", title: "COUNSELING HOUR" },
      { slot: "s4", title: "DM 23C", room: "702" },
      { slot: "s5", title: "COUNSELING HOUR" },
    ],
    3: [
      { slot: "s2", title: "DM 23C", room: "704" },
      { slot: "s3", title: "DM 23B", room: "704" },
      { slot: "s5", title: "DM 23A", room: "704" },
    ],
    4: [
      { slot: "s2", title: "COUNSELING HOUR" },
      { slot: "s3", title: "COUNSELING HOUR" },
    ],
  },
};
