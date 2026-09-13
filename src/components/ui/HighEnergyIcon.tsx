"use client";

/** Official High Energy Hazard visual language: gold disc, black pictogram. Keys must match the approved catalog. */

const INK = "#111111";
const GOLD = "#f5c518";

function Frame(props: { children: React.ReactNode; title: string }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label={props.title}>
      <circle cx="32" cy="32" r="30.5" fill={GOLD} stroke={INK} strokeWidth="3" />
      {props.children}
    </svg>
  );
}

function Pictogram({ energyKey }: { energyKey: string }) {
  switch (energyKey) {
    case "fall_from_elevation_4ft":
      return (
        <>
          <path d="M14 16h22v4H14z" fill={INK} />
          <path d="M14 16v8" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="22" r="3.4" fill={INK} />
          <path d="M38 26c4 3 6 6 8 14" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M40 30 30 36M40 32l10 6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M46 40 34 52M48 42l12 8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "mobile_equipment_workers_on_foot":
      return (
        <>
          <rect x="8" y="28" width="28" height="12" rx="2" fill={INK} />
          <path d="M36 32h8l5 8H36z" fill={INK} />
          <rect x="12" y="20" width="14" height="10" rx="1.5" fill={INK} />
          <circle cx="16" cy="42" r="3.3" fill={INK} />
          <circle cx="38" cy="42" r="3.3" fill={INK} />
          <circle cx="52" cy="22" r="3" fill={INK} />
          <path d="M52 25v11" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M49 44l3-8 3 8" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M48 32h8" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "motor_vehicle_over_30mph":
      return (
        <>
          <path d="M12 34h40l-5-12H22z" fill={INK} />
          <rect x="12" y="34" width="40" height="8" rx="1.5" fill={INK} />
          <circle cx="22" cy="44" r="3.6" fill={INK} />
          <circle cx="44" cy="44" r="3.6" fill={INK} />
          <rect x="24" y="24" width="14" height="8" rx="1" fill={GOLD} />
        </>
      );
    case "suspended_load":
      return (
        <>
          <path d="M32 10v12" stroke={INK} strokeWidth="3" />
          <path d="M24 22h16l-3 5H27z" fill={INK} />
          <rect x="18" y="27" width="28" height="18" rx="1.5" fill={INK} />
          <path d="M18 32h28" stroke={GOLD} strokeWidth="2" />
        </>
      );
    case "swinging_load":
      return (
        <>
          <path d="M14 12h14v3H14z" fill={INK} />
          <path d="M21 15c8 3 18 16 24 26" fill="none" stroke={INK} strokeWidth="3" />
          <rect x="36" y="36" width="16" height="12" rx="1" fill={INK} />
        </>
      );
    case "electrical_contact_50v":
      return <path d="M36 11 20 34h12l-5 19 22-26H36z" fill={INK} />;
    case "arc_flash":
      return (
        <>
          <path d="M32 12 26 30h12z" fill={INK} />
          <path d="M16 34h32M20 42h24M24 50h16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "fire_sustained_fuel":
      return <path d="M32 12s14 11 14 24a14 14 0 0 1-28 0c0-9 9-16 14-24z" fill={INK} />;
    case "excavation_trench_5ft":
      return (
        <>
          <path d="M10 46h44v6H10z" fill={INK} />
          <path d="M18 46 28 20h8l10 26" fill="none" stroke={INK} strokeWidth="3" />
          <path d="M28 20h8" stroke={INK} strokeWidth="3" />
        </>
      );
    case "explosion":
      return (
        <path
          d="M32 10 37 24l13-3-9 11 12 8-13 2 3 13-11-8-11 8 3-13-13-2 12-8-9-11 13 3z"
          fill={INK}
        />
      );
    case "high_temperature_150f":
      return (
        <>
          <rect x="28" y="12" width="8" height="26" rx="4" fill={INK} />
          <circle cx="32" cy="44" r="9" fill={INK} />
        </>
      );
    case "steam":
      return (
        <>
          <rect x="16" y="40" width="32" height="10" rx="2" fill={INK} />
          <path
            d="M22 40c0-10 6-12 6-18m8 18c0-10 6-12 6-18"
            stroke={INK}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "toxic_chemical_radiation":
      return (
        <>
          <circle cx="32" cy="32" r="4.5" fill={INK} />
          <path
            d="M32 16c10 5 13 14 8 22M32 16c-10 5-13 14-8 22M32 48c10-3 16-12 10-20"
            fill="none"
            stroke={INK}
            strokeWidth="3.2"
          />
        </>
      );
    case "heavy_rotating_equipment":
      return (
        <>
          <circle cx="32" cy="32" r="13" fill="none" stroke={INK} strokeWidth="4" />
          <circle cx="32" cy="32" r="4.5" fill={INK} />
          <path d="M32 14v6M32 44v6M14 32h6M44 32h6" stroke={INK} strokeWidth="3" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="10" fill={INK} />;
  }
}

export function HighEnergyIcon(props: {
  energyKey: string;
  label: string;
  size?: number;
  compact?: boolean;
}) {
  const size = props.size ?? (props.compact ? 44 : 56);
  return (
    <span className={`inline-flex items-center gap-3 ${props.compact ? "" : "min-h-14"}`}>
      <span
        className="shrink-0 overflow-hidden rounded-full border border-[#c9a227] bg-white shadow-sm"
        style={{ width: size, height: size }}
      >
        <Frame title={props.label}>
          <Pictogram energyKey={props.energyKey} />
        </Frame>
      </span>
      <span className="min-w-0">
        <span className="eg-kicker block text-[#8a5a00]">High Energy</span>
        <span className={`block leading-tight ${props.compact ? "text-base font-bold" : "text-xl font-bold"}`}>
          {props.label}
        </span>
      </span>
    </span>
  );
}
