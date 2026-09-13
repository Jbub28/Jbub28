"use client";

import { useState } from "react";
import { Field } from "./FieldChrome";
import { formatJobLocation, type JobLocationFields } from "@/lib/domain/jobLocation";

export function JobLocationSummary({ jrb, title = "Job Location" }: { jrb: JobLocationFields; title?: string }) {
  return (
    <article className="eg-card p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-lg">{formatJobLocation(jrb)}</p>
    </article>
  );
}

export function JobLocationFields(props: {
  values: {
    jobLocation: string;
    streetAddress: string;
    gpsCoordinates: string;
    locationIdentifier: string;
  };
  highlights: string[];
  gpsStatus?: string;
  onChange: (key: string, value: string) => void;
  onOptionalGps: () => void;
}) {
  return (
    <section className="eg-card space-y-3 p-4">
      <h2 className="text-xl font-bold">Job Location</h2>
      <p className="text-sm">Where is the work? GPS is optional — you can finish this brief by typing.</p>
      <Field
        id="job-location"
        label="Job Location"
        help="Primary place the crew will work."
        highlight={props.highlights.includes("jobLocation")}
        value={props.values.jobLocation}
        onChange={(v) => props.onChange("jobLocation", v)}
      />
      <Field
        id="street-address"
        label="911/street address"
        help="Street or 911 address from the briefing form."
        highlight={props.highlights.includes("streetAddress")}
        value={props.values.streetAddress}
        onChange={(v) => props.onChange("streetAddress", v)}
      />
      <Field
        id="gps"
        label="GPS coordinates"
        help="Optional. Example 41.87810, -87.62980"
        highlight={props.highlights.includes("gpsCoordinates")}
        value={props.values.gpsCoordinates}
        onChange={(v) => props.onChange("gpsCoordinates", v)}
      />
      <button
        type="button"
        className="min-h-14 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-lg font-bold"
        onClick={props.onOptionalGps}
      >
        Use device GPS (optional)
      </button>
      {props.gpsStatus ? <p className="text-sm" role="status">{props.gpsStatus}</p> : null}
      <Field
        id="location-id"
        label="Pole, structure, equipment, or other identifier"
        help="Use when a pole, structure, or equipment number identifies the site."
        highlight={props.highlights.includes("locationIdentifier")}
        value={props.values.locationIdentifier}
        onChange={(v) => props.onChange("locationIdentifier", v)}
      />
    </section>
  );
}

export function useOptionalGps(onCoords: (lat: number, lng: number) => void) {
  const [gpsStatus, setGpsStatus] = useState("GPS is optional. Type an address or pole number if you do not share location.");
  const capture = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("This device cannot share GPS. Type the address, coordinates, or a pole number.");
      return;
    }
    setGpsStatus("Trying optional GPS…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoords(pos.coords.latitude, pos.coords.longitude);
        setGpsStatus("GPS captured. You can still edit it.");
      },
      () => {
        setGpsStatus("GPS was not used. Type the address, coordinates, or a pole number.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };
  return { gpsStatus, capture };
}
