# ABC do Vinho — Project Context

Educational wine website for the Profissional I course (introductory level).  
Reference design: `../Profissional II/Vinhos do Mundo`  
All content in **Portuguese**.

---

## Source Material

PDFs live in `C:\Users\rodfi\Desktop\Documents\Wine\AEP\Profissional I\Modulo 1-5`.  
Extract images from PDFs where they exist.

| Module | File | Pages |
|---|---|---|
| 1 | Módulo 1 - Texto para Estudo.pdf | 23 |
| 2 | Módulo 2 - Texto para estudo.pdf | 142 |
| 3 main | Modulo 3 - Texto para Estudo.pdf | 78 |
| 3 sub | Módulo 3 - Espumantes - Texto para Estudo.pdf | — |
| 3 sub | Módulo 3 - Madeira - Texto para Estudo.pdf | — |
| 3 sub | Módulo 3 - Porto - Texto para Estudo.pdf | — |
| 3 sub | Módulo 3 - Jerez - Texto para Estudo.pdf | — |
| 4 | Módulo 4 - Texto para estudo.pdf | 26 |
| 5a | Módulo 5 - Texto para estudo 1.pdf | 22 |
| 5b | Módulo 5 - Texto para estudo 2.pdf | — |

---

## Stack

Plain HTML/CSS/JS, no framework. Same approach as Vinhos do Mundo.  
Puppeteer for PDF export — deferred to later phase.  
Quizzes/tests — deferred to later phase.

---

## Site Map

```
index.html                        ← Landing (5 module cards)
modulo1/index.html                ← Viticultura, Solos, Poda, Sommellerie
modulo2/index.html                ← Fermentação e Defeitos
modulo3/index.html                ← Castas landing (5 sub-cards)
  modulo3/castas/index.html       ← Perfis Aromáticos
  modulo3/espumantes/index.html   ← Vinhos Espumantes
  modulo3/porto/index.html        ← Vinho do Porto
  modulo3/madeira/index.html      ← Vinho da Madeira
  modulo3/jerez/index.html        ← Jerez / Sherry
modulo4/index.html                ← Serviço e Sommelier
modulo5/index.html                ← Degustação
css/styles.css                    ← Global reset, layout, typography
css/themes.css                    ← Per-module color themes
js/slides.js                      ← Shared slide navigation engine
```

---

## Design System

Mirrors Vinhos do Mundo. Dark gradient background, gold accent, per-module color themes.

**Global tokens:**
```css
--gold: #D4AF37
--bg-dark: #141414
--bg-card: rgba(255,255,255,0.05)
--cream: #FAF8F5
--font-serif: Georgia, serif
--font-sans: system-ui, sans-serif
```

**Per-module themes:**

| Module | Accent | Gradient dark |
|---|---|---|
| 1 — Viticultura | `#2D5A27` (forest green) | `#1A3318` |
| 2 — Fermentação | `#7A4F1D` (amber) | `#3D2710` |
| 3 — Castas | `#6B2737` (burgundy) | `#3A1420` |
| 4 — Serviço | `#1E3A5F` (navy) | `#0F1E32` |
| 5 — Degustação | `#7A3B2E` (terracotta) | `#3D1D17` |

**Slide format:** 1152×648px (16:9), same as Vinhos do Mundo.  
**Slide granularity:** one slide per named section in the source PDFs.

---

## Slide Budget

| Section | Slides est. |
|---|---|
| Módulo 1 | 40–50 |
| Módulo 2 | 70–90 |
| Módulo 3 — Castas | 30–40 |
| Módulo 3 — Espumantes | 20–25 |
| Módulo 3 — Porto | 25–30 |
| Módulo 3 — Madeira | 20–25 |
| Módulo 3 — Jerez | 20–25 |
| Módulo 4 | 25–35 |
| Módulo 5 | 40–50 |
| **Total** | **~290–370** |

---

## Build Order

1. `css/styles.css` + `css/themes.css` + `js/slides.js`
2. `index.html` (landing)
3. Module 1 (template validation)
4. Modules 2, 3 (with sub-modules), 4, 5
5. `print.css` + Puppeteer PDF export (later)

---

## Open Questions

1. Module 2 mixes fermentation science with cocktail recipes — separate sub-section or integrated?
2. Modules 1 and 3 overlap on soil science content — deduplicate or cross-reference?
3. Modules 2 and 5 both cover ASI competition criteria — same treatment?
