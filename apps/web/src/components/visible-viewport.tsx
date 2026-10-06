"use client";
import { useEffect } from "react";

// Mobile keyboards can shrink the visual viewport without resizing the page.
export function VisibleViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        const unit = parseFloat(getComputedStyle(root).fontSize) || 16;
        const height = viewport?.height ?? window.innerHeight;
        const top = viewport?.offsetTop ?? 0;
        root.style.setProperty("--visible-height", `${height / unit}rem`);
        root.style.setProperty(
          "--visible-middle",
          `${(top + height / 2) / unit}rem`,
        );
        const field = document.activeElement;
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement
        ) {
          const bounds = field.getBoundingClientRect();
          if (bounds.bottom > top + height - 16 || bounds.top < top + 16)
            field.scrollIntoView({ block: "nearest", behavior: "instant" });
        }
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--visible-height");
      document.documentElement.style.removeProperty("--visible-middle");
    };
  }, []);
  return null;
}
