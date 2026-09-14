"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "./FieldChrome";
import { formatJobLocation, type JobLocationFields } from "@/lib/domain/jobLocation";

export function JobLocationSummary({ jrb, title = "Job Location" }: { jrb: JobLocationFields; title?: string }) {
  const hospital = jrb.nearestTraumaHospital
    ? `${jrb.nearestTraumaHospital}${jrb.nearestTraumaHospitalLevel ? ` (${jrb.nearestTraumaHospitalLevel})` : ""}`
    : "";
  return (
    <article className="eg-card p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-lg">{formatJobLocation(jrb)}</p>
      {hospital ? (
        <p className="mt-2 text-sm">
          <span className="font-bold">911 / nearest trauma hospital: </span>
          {hospital}
          {jrb.nearestTraumaHospitalAddress ? ` — ${jrb.nearestTraumaHospitalAddress}` : ""}
        </p>
      ) : null}
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
  onResolved?: (update: Record<string, string | number | null>) => void;
  onOptionalGps: () => void;
}) {
  const [lookupStatus, setLookupStatus] = useState("");
  const autoGps = useRef("");
  const autoHospital = useRef("");
  const lastQuery = useRef("");

  useEffect(() => {
    const query = props.values.jobLocation.trim();
    if (
      query.length < 8 ||
      /^(pole|structure|tower)\b/i.test(query) ||
      !/\d/.test(query) ||
      !/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|circle|ct|court)\b/i.test(query)
    ) {
      return;
    }
    if (query === lastQuery.current) return;
    const handle = window.setTimeout(() => {
      lastQuery.current = query;
      setLookupStatus("Matching the address on the map…");
      fetch(`/api/location/resolve?address=${encodeURIComponent(query)}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Lookup failed");
          const gps = data.geocode?.gpsCoordinates as string | undefined;
          const hospitalText = String(data.hospitalText ?? "");
          const next: Record<string, string | number | null> = {};
          if (gps && (!props.values.gpsCoordinates || props.values.gpsCoordinates === autoGps.current)) {
            autoGps.current = gps;
            next.gpsCoordinates = gps;
            next.gpsLatitude = data.geocode.latitude;
            next.gpsLongitude = data.geocode.longitude;
            next.geocodeSource = data.geocode.source;
          }
          if (hospitalText && (!props.values.streetAddress || props.values.streetAddress === autoHospital.current)) {
            autoHospital.current = hospitalText;
            next.streetAddress = hospitalText;
            next.nearestTraumaHospital = data.hospital?.name ?? "";
            next.nearestTraumaHospitalAddress = data.hospital
              ? `${data.hospital.address}, ${data.hospital.city}, ${data.hospital.state}`
              : "";
            next.nearestTraumaHospitalLevel = data.hospital?.level ?? "";
            next.nearestTraumaHospitalDistanceMiles = data.hospital?.distanceMiles ?? null;
          }
          if (Object.keys(next).length) props.onResolved?.(next);
          setLookupStatus(data.notice ?? "");
        })
        .catch(() => {
          setLookupStatus("Could not match that address. Type GPS and the 911 hospital if you know them.");
        });
    }, 700);
    return () => window.clearTimeout(handle);
    // Only re-run when the work address changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.values.jobLocation]);

  return (
    <section className="eg-card space-y-3 p-4">
      <h2 className="text-xl font-bold">Job Location</h2>
      <p className="text-sm">
        Type the street address of the work. Pole and structure numbers stay in their own field. GPS and the nearest Level II+
        trauma hospital fill in from the address when we can match it.
      </p>
      <Field
        id="job-location"
        label="Job Location"
        help="Street address or named place where the crew will work. Do not put the pole number here."
        highlight={props.highlights.includes("jobLocation")}
        value={props.values.jobLocation}
        onChange={(v) => props.onChange("jobLocation", v)}
      />
      <Field
        id="street-address"
        label="911 / nearest trauma hospital"
        help="Nearest hospital with at least a Level II trauma center, based on the job address. Edit if the crew needs a different destination."
        highlight={props.highlights.includes("streetAddress")}
        value={props.values.streetAddress}
        onChange={(v) => props.onChange("streetAddress", v)}
      />
      <Field
        id="gps"
        label="GPS coordinates"
        help="Filled from the job address when the map finds it. Example 41.87810, -87.62980"
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
      {lookupStatus ? <p className="text-sm" role="status">{lookupStatus}</p> : null}
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
  const [gpsStatus, setGpsStatus] = useState("GPS is optional. Type an address if you do not share location.");
  const capture = () => {
    setGpsStatus("Trying optional GPS…");
    void import("@/lib/device/gps")
      .then(({ readDeviceGps }) => readDeviceGps())
      .then((pos) => {
        onCoords(pos.latitude, pos.longitude);
        setGpsStatus("GPS captured. You can still edit it.");
      })
      .catch(() => {
        setGpsStatus("GPS was not used. Type the address or coordinates.");
      });
  };
  return { gpsStatus, capture };
}
