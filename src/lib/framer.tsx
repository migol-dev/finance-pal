import React from "react";

type AnyProps = Record<string, any> & { children?: React.ReactNode };

function stripAnimProps(props: AnyProps) {
  const { initial, animate, exit, transition, variants, layout, layoutId, whileHover, whileTap, whileInView, onViewportEnter, onViewportLeave, ...rest } = props;
  return rest;
}

function make(Tag: keyof JSX.IntrinsicElements) {
  return function MotionFallback(props: AnyProps) {
    const { children } = props;
    const clean = stripAnimProps(props);
    return React.createElement(Tag as any, clean, children);
  };
}

const fallback: Record<string, any> = {
  div: make("div"),
  section: make("section"),
  header: make("header"),
  main: make("main"),
  nav: make("nav"),
  span: make("span"),
  button: make("button"),
  img: make("img"),
  svg: make("svg"),
  p: make("p"),
  h1: make("h1"),
  h2: make("h2"),
  h3: make("h3"),
  ul: make("ul"),
  li: make("li"),
};

export const motion: any = fallback;

export let AnimatePresence: any = ({ children }: { children: React.ReactNode }) => <>{children}</>;

if (typeof window !== "undefined") {
  // Dynamic load framer-motion in background; when ready, replace fallback components
  import("framer-motion").then((mod) => {
    try {
      const mm = (mod as any).motion || (mod as any);
      if (mm) {
        Object.keys(mm).forEach((k) => {
          try { motion[k] = mm[k]; } catch (e) { /* ignore */ }
        });
      }
      if ((mod as any).AnimatePresence) AnimatePresence = (mod as any).AnimatePresence;
    } catch (e) {
      // ignore
    }
  }).catch(() => {
    // ignore load failures
  });
}

export default null;
