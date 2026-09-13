"use client";

import { useState } from "react";

const INK = "#0a3161";
const GOLD = "#f0c43a";

function Frame(props: { children: React.ReactNode; title: string }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label={props.title}>
      <circle cx="32" cy="32" r="30" fill={GOLD} stroke={INK} strokeWidth="2.5" />
      {props.children}
    </svg>
  );
}

function Pictogram({ energyKey }: { energyKey: string }) {
  switch (energyKey) {
    case "fall_from_elevation_4ft":
      return (
        <>
          <path d="M18 18h28v4H18z" fill={INK} />
          <path d="M28 22v6l6 4-4 8 8 6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="34" cy="16" r="3.2" fill={INK} />
        </>
      );
    case "mobile_equipment_workers_on_foot":
      return (
        <>
          <rect x="12" y="30" width="26" height="12" rx="2" fill={INK} />
          <path d="M38 34h8l4 8H38z" fill={INK} />
          <circle cx="20" cy="44" r="3.2" fill={INK} />
          <circle cx="42" cy="44" r="3.2" fill={INK} />
          <circle cx="50" cy="22" r="3" fill={INK} />
          <path d="M50 25v10m-3 8 3-8 3 8" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "motor_vehicle_over_30mph":
      return (
        <>
          <path d="M14 36h36l-4-10H22z" fill={INK} />
          <rect x="14" y="36" width="36" height="8" rx="1.5" fill={INK} />
          <circle cx="22" cy="46" r="3.4" fill={INK} />
          <circle cx="42" cy="46" r="3.4" fill={INK} />
        </>
      );
    case "suspended_load":
      return (
        <>
          <path d="M32 12v10" stroke={INK} strokeWidth="3" />
          <path d="M24 22h16l-2 4H26z" fill={INK} />
          <rect x="20" y="26" width="24" height="18" rx="1.5" fill={INK} />
        </>
      );
    case "swinging_load":
      return (
        <>
          <path d="M18 14h10v3H18z" fill={INK} />
          <path d="M23 17c8 2 16 12 22 22" fill="none" stroke={INK} strokeWidth="3" />
          <rect x="36" y="36" width="14" height="12" rx="1" fill={INK} />
        </>
      );
    case "electrical_contact_50v":
      return <path d="M36 12 22 34h10l-4 18 18-24H36z" fill={INK} />;
    case "arc_flash":
      return (
        <>
          <path d="M32 14 28 28h8z" fill={INK} />
          <path d="M18 32h28M22 40h20M26 48h12" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "fire_sustained_fuel":
      return <path d="M32 14s12 10 12 22a12 12 0 0 1-24 0c0-8 8-14 12-22z" fill={INK} />;
    case "excavation_trench_5ft":
      return (
        <>
          <path d="M12 44h40v6H12z" fill={INK} />
          <path d="M20 44 28 22h8l8 22" fill="none" stroke={INK} strokeWidth="3" />
        </>
      );
    case "explosion":
      return (
        <path
          d="M32 12 36 24l12-2-8 10 10 8-12 2 2 12-10-8-10 8 2-12-12-2 10-8-8-10 12 2z"
          fill={INK}
        />
      );
    case "high_temperature_150f":
      return (
        <>
          <rect x="28" y="14" width="8" height="24" rx="4" fill={INK} />
          <circle cx="32" cy="44" r="8" fill={INK} />
        </>
      );
    case "steam":
      return (
        <>
          <rect x="18" y="38" width="28" height="10" rx="2" fill={INK} />
          <path d="M24 38c0-8 4-10 4-16m8 16c0-8 4-10 4-16" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "toxic_chemical_radiation":
      return (
        <>
          <circle cx="32" cy="32" r="4" fill={INK} />
          <path d="M32 18c8 4 10 12 6 18M32 18c-8 4-10 12-6 18M32 46c8-2 12-10 8-16" fill="none" stroke={INK} strokeWidth="3" />
        </>
      );
    case "heavy_rotating_equipment":
      return (
        <>
          <circle cx="32" cy="32" r="12" fill="none" stroke={INK} strokeWidth="4" />
          <circle cx="32" cy="32" r="4" fill={INK} />
          <path d="M32 16v6M32 42v6M16 32h6M42 32h6" stroke={INK} strokeWidth="3" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="10" fill={INK} />;
  }
}

export function HighEnergyIcon(props: {
  energyKey: string;
  label: string;
  src?: string | null;
  size?: number;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = props.size ?? (props.compact ? 40 : 56);
  const useFile = Boolean(props.src) && !failed;
  return (
    <span className={`inline-flex items-center gap-3 ${props.compact ? "" : "min-h-14"}`}>
      <span className="shrink-0 overflow-hidden rounded-full border border-[#d0d7e2] bg-white shadow-sm" style={{ width: size, height: size }}>
        {useFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.src ?? ""}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <Frame title={props.label}>
            <Pictogram energyKey={props.energyKey} />
          </Frame>
        )}
      </span>
      <span className={props.compact ? "text-base font-bold" : "text-xl font-bold"}>{props.label}</span>
    </span>
  );
}
