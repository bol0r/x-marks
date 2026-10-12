import { catOf, type IconName } from "../../core/cats";

export function DronIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4" />
      <circle cx="25" cy="7" r="4" />
      <circle cx="7" cy="25" r="4" />
      <circle cx="25" cy="25" r="4" />
      <path d="M10 10l12 12M22 10L10 22" />
      <rect x="13" y="13" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function ChillIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 22c4-3 8-3 12 0s8 3 12 0" />
      <path d="M16 4l-6 12h12z" />
      <path d="M16 16v3" />
    </svg>
  );
}

export function CozyIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 13h17v7a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z" />
      <path d="M23 15h2a3 3 0 0 1 0 6h-2" />
      <path d="M11 4c0 2 2 2 2 4M16 4c0 2 2 2 2 4" />
    </svg>
  );
}

export function IconArt({ icon }: { icon: IconName }) {
  if (icon === "dron") return <DronIcon />;
  if (icon === "chill") return <ChillIcon />;
  if (icon === "cozy") return <CozyIcon />;
  if (icon === "eye") return <EyeIcon />;
  if (icon === "tree") return <TreeIcon />;
  return <PinIcon />;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16z" />
      <circle cx="16" cy="16" r="4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <path d="M16 28s8-7 8-14a8 8 0 1 0-16 0c0 7 8 14 8 14z" />
      <circle cx="16" cy="14" r="2.5" fill="currentColor" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M16 28V14" />
      <path d="M16 18l-8 6h16z" />
      <path d="M16 10l-6 6h12z" />
    </svg>
  );
}

export function CatIcon({ cat }: { cat: string }) {
  return <IconArt icon={catOf(cat).icon} />;
}

export function TrailArt() {
  return (
    <svg class="trail-art" viewBox="0 0 340 120" aria-hidden="true">
      <path class="isle" d="M232 70c10-26 52-34 80-18 20 12 18 40-6 50-30 12-84 4-74-32z" />
      <path class="path" d="M18 96c40-6 52-58 98-56s46 46 86 40 38-26 72-18" />
      <path class="x" d="M262 70l26 26M288 70l-26 26" />
    </svg>
  );
}
