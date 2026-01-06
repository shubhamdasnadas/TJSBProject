"use client";

import { useEffect, useRef, useState } from "react";

interface EncryptedTextProps {
  text: string;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealDelayMs?: number;
  trigger?: number;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

export const EncryptedText = ({
  text,
  encryptedClassName = "",
  revealedClassName = "",
  revealDelayMs = 25,
  trigger = 0,
}: EncryptedTextProps) => {
  const [display, setDisplay] = useState("");
  const frame = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    frame.current = 0;
    setDisplay("");

    const animate = () => {
      let out = "";

      for (let i = 0; i < text.length; i++) {
        if (i < frame.current) out += text[i];
        else if (text[i] === " ") out += " ";
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }

      setDisplay(out);

      if (frame.current <= text.length) {
        frame.current += 1;
        timer.current = window.setTimeout(animate, revealDelayMs);
      }
    };

    animate();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, revealDelayMs, trigger]);

  return (
    <span>
      {display.split("").map((c, i) => (
        <span
          key={i}
          className={
            i < frame.current ? revealedClassName : encryptedClassName
          }
        >
          {c}
        </span>
      ))}
    </span>
  );
};