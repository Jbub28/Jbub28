export interface DepartureTimeOption {
  value: string;
  label: string;
  hint?: string;
}

/** Departure times aligned with Signal4 crash patterns (rush hour, night, etc.) */
export const DEPARTURE_TIME_OPTIONS: DepartureTimeOption[] = [
  { value: "06:00", label: "6:00 AM", hint: "Early morning" },
  { value: "07:00", label: "7:00 AM", hint: "Morning commute" },
  { value: "07:30", label: "7:30 AM", hint: "Morning rush" },
  { value: "08:00", label: "8:00 AM", hint: "Morning rush" },
  { value: "09:00", label: "9:00 AM", hint: "Late morning" },
  { value: "10:00", label: "10:00 AM", hint: "Mid-morning" },
  { value: "12:00", label: "12:00 PM", hint: "Lunch hour" },
  { value: "14:00", label: "2:00 PM", hint: "Afternoon" },
  { value: "15:00", label: "3:00 PM", hint: "School pickup" },
  { value: "16:30", label: "4:30 PM", hint: "Evening rush" },
  { value: "17:00", label: "5:00 PM", hint: "Evening rush" },
  { value: "17:30", label: "5:30 PM", hint: "Evening rush" },
  { value: "18:00", label: "6:00 PM", hint: "Evening" },
  { value: "19:00", label: "7:00 PM", hint: "Evening" },
  { value: "21:00", label: "9:00 PM", hint: "Night" },
  { value: "22:00", label: "10:00 PM", hint: "Night" },
  { value: "23:00", label: "11:00 PM", hint: "Late night" },
  { value: "00:00", label: "12:00 AM", hint: "Late night" },
  { value: "01:00", label: "1:00 AM", hint: "Late night" },
  { value: "custom", label: "Custom time…" },
];

export function formatTimeLabel(value: string): string {
  const preset = DEPARTURE_TIME_OPTIONS.find((o) => o.value === value && o.value !== "custom");
  if (preset) return `${preset.label} — ${preset.hint}`;
  if (value === "custom") return "Custom time…";
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
