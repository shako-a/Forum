"use client";

import { useRouter } from "next/navigation";

// "Show N per page" dropdown — navigates to the matching pre-built URL.
export function PerPageSelect({
  value,
  options,
  label,
}: {
  value: number;
  options: Array<{ n: number; href: string }>;
  label: string;
}) {
  const router = useRouter();
  return (
    <label className="mk-perpage">
      <span className="muted-sm">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.n === Number(e.target.value));
          if (opt) router.push(opt.href);
        }}
      >
        {options.map((o) => (
          <option key={o.n} value={o.n}>
            {o.n}
          </option>
        ))}
      </select>
    </label>
  );
}
