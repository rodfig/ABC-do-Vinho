# ABC do Vinho — Project Context

Educational wine website for the Profissional I course (introductory level).  
Reference design: `../Profissional II/Vinhos do Mundo`  
All content in **Portuguese**.

---

## Source Material

PDFs live in `C:\Users\rodfi\Desktop\Documents\Wine\AEP\Profissional I\`.

| Site Module | Source PDF | Notes |
|---|---|---|
| 1 | Módulo 1/Módulo 1 - Texto para Estudo.pdf | 23 pages |
| 2 | Módulo 2/Módulo 2 - Texto para estudo.pdf | pages 1–122 (viticultura, regiões) |
| 3 | Módulo 2/Módulo 2 - Texto para estudo.pdf | pages 123–142 (casta fichas) |
| 4 | Módulo 3/Modulo 3 - Texto para Estudo.pdf + sub-PDFs | espumantes, porto, madeira, jerez |
| 5 | Módulo 4/Módulo 4 - Texto para estudo.pdf | 26 pages |
| 6 | Módulo 5/Módulo 5 - Texto para estudo 1.pdf + 2.pdf | degustação |

> Site modules do not map 1:1 to course PDFs. Modules 3–6 each draw from one or more PDFs.

---

## Stack

Plain HTML/CSS/JS, no framework. Same approach as Vinhos do Mundo.  
Puppeteer for PDF export — deferred to later phase.  
Quizzes/tests — deferred to later phase.

---

## Site Map

```
index.html                        ← Landing (6 module cards)
modulo1/index.html                ← 18 chapters, grouped sidebar (COMPLETE)
modulo2/index.html                ← 23 chapters — Viticultura, Regiões e Vinhos (COMPLETE)
modulo3/index.html                ← 20 chapters — Castas de Portugal (COMPLETE)
modulo4/index.html                ← Vinhos Especiais landing (4 sub-cards) (pending)
  modulo4/espumantes/index.html   ← Vinhos Espumantes (pending)
  modulo4/porto/index.html        ← Vinho do Porto (pending)
  modulo4/madeira/index.html      ← Vinho da Madeira (pending)
  modulo4/jerez/index.html        ← Jerez / Sherry (pending)
modulo5/index.html                ← Serviço e Sommelier (pending)
modulo6/index.html                ← Degustação (pending)
css/styles.css                    ← Global reset, layout, typography, components
js/main.js                        ← Chapter navigation engine
```

---

## Design System

Mirrors Vinhos do Mundo. Cream page background, dark sidebar, gold accent, per-module color themes.

**Global tokens (in CSS):**
```css
--gold: #D4AF37
--page-bg: #F8F4EF
--page-text: #2A2118
--page-muted: #7A6858
```

**Per-module themes (data-module attribute on body):**

| Module | Content | Accent | CSS |
|---|---|---|---|
| 1 | História e Cultura | burgundy `#8B2935` | `[data-module="1"]` |
| 2 | Viticultura e Regiões | forest green `#2D5A27` | `[data-module="2"]` |
| 3 | Castas de Portugal | amber `#7A4F1D` | `[data-module="3"]` |
| 4 | Vinhos Especiais | navy `#1E3A5F` | `[data-module="4"]` |
| 5 | Serviço e Sommelier | terracotta `#7A3B2E` | `[data-module="5"]` |
| 6 | Degustação | violet `#5B2E8A` | `[data-module="6"]` (add to CSS) |

**Chapter format:** full-length scrollable page per topic (not fixed-height slides).  
**Chapter granularity:** one chapter per named section in the source PDFs.

**Chapter numbering:** Sidebar nav-nums (e.g. `<span class="nav-num">01</span>`) are kept — they provide visual rhythm and position in the sidebar. Do NOT add `<p class="chapter-eyebrow">Capítulo XX</p>` to chapter content — it is redundant (sidebar already shows the number) and adds visual noise above the title.

**Layout:**
- Desktop: 230px fixed sidebar + `1fr` content area. Chapter `max-width: 820px`, left-aligned.
- Mobile (≤768px): sidebar as fixed overlay drawer (hamburger toggle), bottom nav bar (prev/counter/next).
- Scroll arrows: two ↑↓ buttons, `position: fixed`, vertically centred, `right: max(1rem, calc(100vw - 230px - 820px - 2.5rem))` — floats in whitespace beside text column. Muted at top/bottom of scroll.

**Module 2 sidebar groups:** Viticultura / Terroir / Castas / Regiões de Portugal  
**Module 3 sidebar groups:** Introdução / Tintas / Brancas  
**Module 1 sidebar groups:** História / Classificação e Entidades / Portugal Hoje / Cultura e Futuro

---

## Slide Budget

| Module | Content | Chapters |
|---|---|---|
| 1 | História e Cultura | 18 (done) |
| 2 | Viticultura e Regiões | 24 (done) |
| 3 | Castas de Portugal | 20 (done) |
| 4 | Vinhos Especiais (4 sub-modules) | ~80–100 est. |
| 5 | Serviço e Sommelier | ~25–35 est. |
| 6 | Degustação | ~40–50 est. |

---

## Build Order

1. ✅ `css/styles.css` + `js/main.js`
2. ✅ `index.html` (landing)
3. ✅ Module 1 — 18 chapters
4. ✅ Module 2 — 23 chapters (viticultura, terroir, regiões)
5. ⚠️ Module 3 — built but disabled pending rework (disabled on landing)
6. Module 4 — Vinhos Especiais (espumantes, porto, madeira, jerez sub-modules)
7. Module 5 — Serviço e Sommelier
8. Module 6 — Degustação
9. Update landing `index.html` from 5 → 6 module cards
10. `print.css` + Puppeteer PDF export (later)

## Deploy

GitHub → Vercel auto-deploy on push to `master`.

---

## Open Questions

1. Module 4: flat file or sub-module landing? (Currently planned as landing + 4 sub-modules.)
2. Modules 1 and 2 overlap on soil science — cross-reference in Module 2 or note in Module 1?
3. Modules 2 and 6 both cover tasting methodology — same treatment or different depth?
