"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { IconType } from "react-icons";
import {
  FaBriefcase,
  FaEnvelope,
  FaFolderOpen,
  FaHome,
  FaPenNib,
  FaServer,
  FaUser,
} from "react-icons/fa";

// liquid-glass-react reads `navigator` during render and relies on browser-only
// APIs (canvas, SVG filters), so it must never run on the server.
const LiquidGlass = dynamic(() => import("liquid-glass-react"), { ssr: false });

type NavEntry = { id: string; label: string; Icon: IconType };

const NAV: NavEntry[] = [
  { id: "home", label: "Home", Icon: FaHome },
  { id: "about", label: "About", Icon: FaUser },
  { id: "services", label: "Services", Icon: FaServer },
  { id: "experience", label: "Experience", Icon: FaBriefcase },
  { id: "portfolio", label: "Work", Icon: FaFolderOpen },
  { id: "skills", label: "Blog", Icon: FaPenNib },
  { id: "contact", label: "Contact", Icon: FaEnvelope },
];

export default function BottomNav({ active }: { active: string }) {
  const getHref = (id: string) => (id === "skills" ? "/blog" : `/#${id}`);

  // The glass overlay/refraction layers only re-measure on a window "resize".
  // When the active item expands its label the pill changes width, so we nudge
  // a resize across the ~0.35s expand transition to keep the glass edges synced.
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      window.dispatchEvent(new Event("resize"));
      if (now - start < 440) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div className="bottom-nav-anchor" aria-label="Portfolio sections">
      <LiquidGlass
        className="bottom-nav-glass"
        // absolute (vs the lib's default relative) so its stacked layers overlap
        // and centre on the zero-size anchor instead of drifting down the flow.
        style={{ position: "absolute" }}
        cornerRadius={999}
        padding="6px"
        elasticity={0}
        blurAmount={0.07}
        saturation={125}
        displacementScale={48}
        aberrationIntensity={1.5}
      >
        <nav className="bottom-nav-items">
          {NAV.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <a
                key={id}
                href={getHref(id)}
                className={`bn-item ${isActive ? "active" : ""}`}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="bn-icon" aria-hidden />
                <span className="bn-label">{label}</span>
              </a>
            );
          })}
        </nav>
      </LiquidGlass>
    </div>
  );
}
