"use client";

/** Official High Energy cards from the supplied STKY icon sheet. Keys must match the approved catalog. */

const INK = "#111111";
const GOLD = "#f5c518";

const ICON_SRC: Record<string, string> = {
  suspended_load: "/controlled/high-energy/suspended-load.png",
  mobile_equipment_workers_on_foot: "/controlled/high-energy/mobile-equipment-workers-on-foot.png",
  heavy_rotating_equipment: "/controlled/high-energy/heavy-rotating-equipment.png",
  steam: "/controlled/high-energy/steam.png",
  explosion: "/controlled/high-energy/explosion.png",
  electrical_contact_50v: "/controlled/high-energy/electrical-contact-50v.png",
  toxic_chemical_radiation: "/controlled/high-energy/toxic-chemical-radiation.png",
  fall_from_elevation_4ft: "/controlled/high-energy/fall-from-elevation-4ft.png",
  motor_vehicle_over_30mph: "/controlled/high-energy/motor-vehicle-over-30mph.png",
  high_temperature_150f: "/controlled/high-energy/high-temperature-150f.png",
  fire_sustained_fuel: "/controlled/high-energy/fire-sustained-fuel.png",
  excavation_trench_5ft: "/controlled/high-energy/excavation-trench-5ft.png",
  arc_flash: "/controlled/high-energy/arc-flash.png",
};

function FallbackFrame(props: { children: React.ReactNode; title: string }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label={props.title}>
      <circle cx="32" cy="32" r="30.5" fill={GOLD} stroke={INK} strokeWidth="3" />
      {props.children}
    </svg>
  );
}

export function HighEnergyIcon(props: {
  energyKey: string;
  label: string;
  size?: number;
  compact?: boolean;
}) {
  const src = ICON_SRC[props.energyKey];
  const width = props.size ?? (props.compact ? 52 : 80);
  const height = Math.round(width * (380 / 320));
  return (
    <span className={`inline-flex items-center gap-3 ${props.compact ? "" : "min-h-14"}`}>
      <span className="shrink-0" style={{ width, height }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={props.label} width={width} height={height} className="h-full w-full object-contain" />
        ) : (
          <FallbackFrame title={props.label}>
            <rect x="36" y="36" width="16" height="12" rx="1" fill={INK} />
            <path d="M21 15c8 3 18 16 24 26" fill="none" stroke={INK} strokeWidth="3" />
          </FallbackFrame>
        )}
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
