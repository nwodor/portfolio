"use client";

import { useEffect, useState } from "react";

type TypewriterOptions = {
  /** ms per character */
  speed?: number;
  /** ms before the first character */
  startDelay?: number;
  /** ms paused between segments */
  linePause?: number;
};

type TypewriterState = {
  /** the typed-so-far substring for each segment, in order */
  rendered: string[];
  /** index of the segment currently being typed, or -1 when finished */
  activeIndex: number;
  /** true once every segment is fully typed */
  done: boolean;
};

/**
 * Types an ordered list of strings one after another, character by character.
 * Honours prefers-reduced-motion by revealing everything instantly.
 * `segments` must be a stable reference (define it as a module constant).
 */
export function useTypewriter(
  segments: string[],
  { speed = 42, startDelay = 320, linePause = 320 }: TypewriterOptions = {},
): TypewriterState {
  const [counts, setCounts] = useState<number[]>(() => segments.map(() => 0));
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCounts(segments.map((segment) => segment.length));
      setDone(true);
      return;
    }

    setCounts(segments.map(() => 0));
    setDone(false);

    let segment = 0;
    let char = 0;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (segment >= segments.length) {
        setDone(true);
        return;
      }
      const text = segments[segment];
      if (char < text.length) {
        char += 1;
        const at = segment;
        const value = char;
        setCounts((prev) => {
          const next = [...prev];
          next[at] = value;
          return next;
        });
        timer = setTimeout(step, speed);
      } else {
        segment += 1;
        char = 0;
        timer = setTimeout(step, linePause);
      }
    };

    timer = setTimeout(step, startDelay);
    return () => clearTimeout(timer);
  }, [segments, speed, startDelay, linePause]);

  const rendered = segments.map((segment, index) => segment.slice(0, counts[index]));
  const activeIndex = counts.findIndex((count, index) => count < segments[index].length);

  return { rendered, activeIndex, done };
}
