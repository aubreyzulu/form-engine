# 10 — Brand & Visual Guide

The visual language for the web UI (`apps/web`). Derived from
`brand-style-guide.pdf`; this doc is the source of truth for the design tokens, and
`apps/web/app/globals.css` should mirror the values below.

> Keep presentation tokens here, behaviour in code. When a token changes, change it
> in one place (`globals.css` `@theme`) — components reference the token, never a raw
> hex.

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | `#FF4C00` | Primary actions (buttons, active state), brand accents. |
| `secondary` | `#E56565` | Supporting accent / highlights that aren't the primary CTA. |
| `accent` | `#FF4C00` | Emphasis; same hue as primary by design. |
| `background` | `#F9F9F9` | Page background (light theme). |
| `textPrimary` | `#262626` | Body and heading text. |
| `link` | `#FF4C00` | Hyperlinks. *(Source swatch was clipped; standardised to the primary orange.)* |

**Semantic states — extension (not in source).** A forms UI must signal validation
clearly, which the brand doesn't define. Proposed, pending sign-off:

| State | Hex | Use |
| --- | --- | --- |
| `error` | `#DC2626` | Field errors, `422` messages, `aria-invalid` styling. |
| `success` | `#16A34A` | Submission confirmation. |

> `secondary` (`#E56565`) is a warm coral, **not** an error red — don't reuse it for
> validation errors, or success/error become ambiguous.

## Typography

- **Family:** Suisse (headings and body). Suisse is a licensed font; until it's
  provisioned, fall back to the scaffold's Geist / a neutral system stack:
  `'Suisse Intl', Geist, system-ui, sans-serif`.
- **Scale** (from source): `H1 60px` · `H2 52px` · `Body 16px`. Body line-height
  ~1.5 for legibility; tighten heading leading.

## Spacing & theme

- **Base unit: 4px.** All spacing is a multiple of 4 (4, 8, 12, 16, 24, 32…) — this
  is Tailwind's default scale, so use the scale (`p-2` = 8px) rather than arbitrary
  values.
- **Border radius: 4px** (`rounded` / `rounded-sm`). One radius everywhere.
- **Colour scheme: light.** No dark mode in scope; the scaffold's
  `prefers-color-scheme: dark` block can be removed when these tokens land.

## Applying it (Tailwind v4)

`apps/web` uses Tailwind v4 (CSS-first config). Define the tokens once in
`app/globals.css` so utilities like `bg-primary` / `text-foreground` resolve:

```css
@import "tailwindcss";

@theme {
  --color-primary: #ff4c00;
  --color-secondary: #e56565;
  --color-accent: #ff4c00;
  --color-background: #f9f9f9;
  --color-foreground: #262626;
  --color-error: #dc2626;
  --color-success: #16a34a;

  --radius: 4px;
  --font-sans: "Suisse Intl", Geist, system-ui, sans-serif;
}
```

Then components use semantic utilities (`bg-primary`, `text-foreground`,
`rounded-[--radius]`) — never inline hex. Per `apps/web/CLAUDE.md`, styling stays
clean and legible over decorative; restrained shadows, sensible rhythm.
