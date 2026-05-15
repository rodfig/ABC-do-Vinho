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
| 4 | Módulo 3/Modulo 3 - Texto para Estudo.pdf | 78 pages (fermentação e vinificação) |
| 5 | Módulo 3/sub-PDFs | espumantes, porto, madeira, jerez (detailed) |
| 6 | Módulo 4/Módulo 4 - Texto para estudo.pdf | serviço de bar — cocktails, IBA, ABP, utensílios, copos |
| 7 | Módulo 5/Módulo 5 - Texto para estudo 1.pdf | degustação de vinhos — terroir, análise sensorial, normas de prova |
| 8 | Módulo 5/Módulo 5 - Texto para estudo 2.pdf | serviço de vinhos — garrafas, rolhas, protocolo do sommelier |

> Site modules do not map 1:1 to course PDFs. Modules 6–8 each draw from one PDF.

---

## Stack

Plain HTML/CSS/JS, no framework. Same approach as Vinhos do Mundo.  
Puppeteer for PDF export — deferred to later phase.  
Quizzes/tests — deferred to later phase.

---

## Site Map

```
index.html                        ← Landing (8 module cards)
modulo1/index.html                ← 18 chapters, grouped sidebar (COMPLETE)
modulo2/index.html                ← 24 chapters — Viticultura, Regiões e Vinhos (COMPLETE)
modulo3/index.html                ← 36 chapters — Castas de Portugal (COMPLETE)
modulo4/index.html                ← 22 chapters — Fermentação e Vinificação (COMPLETE)
modulo5/index.html                ← 30 chapters — Vinhos Especiais (Espumantes / Porto / Madeira / Jerez) (COMPLETE)
modulo6/index.html                ← 33 chapters — Serviço de Bar — cocktails, IBA, utensílios (COMPLETE)
modulo7/index.html                ← Degustação de Vinhos (COMPLETE — 10 capítulos, 15 imagens)
modulo8/index.html                ← 20 chapters — Serviço de Vinhos — protocolo e sommelier (COMPLETE)
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
| 4 | Fermentação e Vinificação | teal `#2E6B6B` | `[data-module="4"]` |
| 5 | Vinhos Especiais | navy `#1E3A5F` | `[data-module="5"]` |
| 6 | Serviço de Bar | terracotta `#7A3B2E` | `[data-module="6"]` |
| 7 | Degustação de Vinhos | violet `#5B2E8A` | `[data-module="7"]` |
|   | → 10 capítulos, todas as 15 imagens inseridas | | |
| 8 | Serviço de Vinhos | olive `#4A5E3A` | `[data-module="8"]` |

**Chapter format:** full-length scrollable page per topic (not fixed-height slides).  
**Chapter granularity:** one chapter per named section in the source PDFs.

**Chapter numbering:** Sidebar nav-nums (e.g. `<span class="nav-num">01</span>`) are kept — they provide visual rhythm and position in the sidebar. Do NOT add `<p class="chapter-eyebrow">Capítulo XX</p>` to chapter content — it is redundant (sidebar already shows the number) and adds visual noise above the title.

**Layout:**
- Desktop: 230px fixed sidebar + `1fr` content area. Chapter `max-width: 820px`, left-aligned.
- Mobile (≤768px): sidebar as fixed overlay drawer (hamburger toggle), bottom nav bar (prev/counter/next).
- Scroll arrows: two ↑↓ buttons, `position: fixed`, vertically centred, `right: max(1rem, calc(100vw - 230px - 820px - 2.5rem))` — floats in whitespace beside text column. Muted at top/bottom of scroll.

**Module 2 sidebar groups:** Viticultura / Terroir / Castas / Regiões de Portugal  
**Module 3 sidebar groups:** Introdução / Tintas / Brancas  
**Module 4 sidebar groups:** Leveduras e FA / Condução / Maceração / Vinificação / Estilos Especiais  
**Module 5 sidebar groups:** Espumantes / Vinho do Porto / Vinho da Madeira / Jerez / Sherry  
**Module 6 sidebar groups:** Introdução ao Bar / Utensílios e Copos / Serviço e Atendimento / The Unforgettables / Contemporary Classics / Competição e Excelência  
**Module 8 sidebar groups:** Garrafas e Fechos / Serviço Profissional / Copos e Ferramentas / Garrafeira e Carta  
**Module 1 sidebar groups:** História / Classificação e Entidades / Portugal Hoje / Cultura e Futuro

---

## Module IV Chapter Plan (Fermentação e Vinificação — 22 chapters)

Source: `Módulo 3/Modulo 3 - Texto para Estudo.pdf` (78 pages)

### Grupo: Leveduras e Fermentação Alcoólica
| # | Title | Key content |
|---|---|---|
| 01 | Condução da Fermentação Alcoólica | açúcares, fases, parâmetros, conversão açúcar→álcool |
| 02 | Flora Natural das Uvas e da Adega | factores, fungos/bactérias, leveduras protagonistas |
| 03 | Inoculação de Leveduras | inóculo líquido, espontânea, domínio Saccharomyces |
| 04 | Metabolismo das Leveduras | carbono (glicólise, respiração vs fermentação), azoto, fósforo, enxofre |
| 05 | Glicólise e Equação da Fermentação | açúcares fermentescíveis, equação global, temperatura |
| 06 | Paragens de Fermentação | causas, deficiências, etanol tóxico, substâncias tóxicas, prevenção |
| 07 | Defeitos Aromáticos e Compostos Sulfurosos | mercaptanos, H₂S, remoção com cobre, ácido acético |

### Grupo: Condução da Fermentação
| # | Title | Key content |
|---|---|---|
| 08 | Cinética e Medição da Fermentação | taxa de produção, densidade, Brix, escalas (Baumé, Oechsle, TAP) |
| 09 | Temperatura, CO₂ e Controlo Térmico | libertação de calor, segurança CO₂, camisas, fermentação em barricas |
| 10 | Fermentação Maloláctica | ácido málico→lático, Oenococcus oeni, condições, vantagens/desvantagens |

### Grupo: Maceração e Extracção
| # | Title | Key content |
|---|---|---|
| 11 | Fundamentos da Maceração | antocianinas, taninos, Lei de Fick, fatores externos (SO₂, etanol, temperatura) |
| 12 | Tipos de Maceração | pré-fermentativa, convencional, pós-fermentativa; tempos e objetivos |
| 13 | Remontagem e Délestage | técnicas de remontagem, délestage, tipos de bombas |
| 14 | Hiperoxigenação e Crio-extracção | objetivos, procedimento, Blanc de Noirs, vantagens/limitações |

### Grupo: O Processo de Vinificação
| # | Title | Key content |
|---|---|---|
| 15 | Da Vindima à Adega | maturação tecnológica, vindima mecânica vs manual, receção, desengace, prensagem |
| 16 | Defecação e Fermentação | débourbage, inoculação, temperatura brancos vs tintos, FML na adega |
| 17 | Desencuba, Trasfegas e Estágio | desencuba, vinho de gota vs prensa, trasfegas, envelhecimento (inox, madeira, borras) |
| 18 | Clarificação, Estabilização e Engarrafamento | agentes clarificantes, estabilização tartárica/proteica, filtração, SO₂ final |

### Grupo: Estilos Especiais
| # | Title | Key content |
|---|---|---|
| 19 | Vinhos Naturais | leveduras indígenas, sem SO₂, mínima intervenção |
| 20 | Vinhos Espumantes | método clássico (remuage, dégorgement), charmat, asti; licor de tiragem e expedição |
| 21 | Vinhos Fortificados | Porto (ruby vs tawny, momento da aguardentação), Madeira (estufagem) |
| 22 | Vinhos de Curtimenta | maceração pelicular prolongada, ânforas, perfil sensorial |

---

## Slide Budget

| Module | Content | Chapters |
|---|---|---|
| 1 | História e Cultura | 18 (done) |
| 2 | Viticultura e Regiões | 24 (done) |
| 3 | Castas de Portugal | 36 (done) |
| 4 | Fermentação e Vinificação | 22 (done) |
| 5 | Vinhos Especiais (4 sub-modules) | 30 (done) |
| 6 | Serviço de Bar | 33 (done) |
| 7 | Degustação de Vinhos | 10 (done — all 15 images inserted) |
| 8 | Serviço de Vinhos | 20 (done) |

---

## Build Order

1. ✅ `css/styles.css` + `js/main.js`
2. ✅ `index.html` (landing)
3. ✅ Module 1 — 18 chapters
4. ✅ Module 2 — 24 chapters (viticultura, terroir, regiões)
5. ✅ Module 3 — 36 chapters (castas tintas + brancas)
6. ✅ Module 4 — Fermentação e Vinificação (22 chapters)
7. ✅ Module 5 — Vinhos Especiais (30 chapters, flat file)
8. ✅ Module 6 — Serviço de Bar (33 chapters)
9. ✅ Module 7 — Degustação de Vinhos (10 capítulos, 15 imagens)
10. ✅ Module 8 — Serviço de Vinhos (20 chapters)
11. `print.css` + Puppeteer PDF export (later)

## Deploy

GitHub → Vercel auto-deploy on push to `master`.

---

## Open Questions

1. Modules 1 and 2 overlap on soil science — cross-reference in Module 2 or note in Module 1?
2. Modules 2 and 7 both cover terroir/tasting methodology — same treatment or different depth?
