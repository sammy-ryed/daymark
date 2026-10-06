import type { CSSProperties } from "react";
export function Headline() {
  const title = "Good work.\nLess noise.";
  return (
    <div className="headline-wrap">
      <h1 className="warped">{title}</h1>
      <div aria-hidden="true" className="headline-echo">
        {title}
      </div>
      <div aria-hidden="true" className="slices">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            style={
              {
                "--i": i,
                "--shift": `${Math.sin(i * 1.3) * 0.5}rem`,
                clipPath: `inset(0 ${100 - (i + 1) * 6.25}% 0 ${i * 6.25}%)`,
              } as CSSProperties
            }
          >
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}
