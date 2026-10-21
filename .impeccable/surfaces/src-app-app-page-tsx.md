---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: []
---

## Scope

DEVDOC app shell: general panel, operation panel, document list, reader, editor, admin. Visitor mode: Operate (reader view leans Read).

## Audience and job

Internal team (~100 people) finding, writing and copying documentation, prompts and code. Success: the right document in seconds, copy in one click, writing without knowing Markdown.

## Direction contract

THESIS: Light filtered through tinted glass, after Marianne Peretti's windows in the Brasília cathedral. The shell is frosted glass over slow vertical bands of blue, green and white light, and each operation tints the light. Refuses the gray sidebar, white page and single blue accent of Notion and Confluence.

OWN-WORLD: Cool off-white ground (#EEF1EE family, green-grey, never cream), navy ink #14284A, Peretti teal for action, sky blue and sand as counterlight. Dark mode is the cathedral at night: deep navy ground #08111F with the light bands glowing through. Panels are frosted glass (blur 22px, saturate, 1px luminous edge, soft offset shadow), radius 26px on panels, 14px on controls, pills for tags. Each operation owns one vitral tone used for its swatch, its light bands and its active state. Faces: Bricolage Grotesque for display, Albert Sans for UI and reading, Spline Sans Mono for code only.

STORY: The visitor lands on the general panel, searches or resumes where they stopped, opens a document, copies a prompt with its variables filled, or writes a new one with a visual editor. Operation panels feel like walking into that operation's chapel: same building, different light.

FIRST VIEWPORT: Left glass rail 264px: wordmark, Painel geral, Documentos, Favoritos, Rascunhos, Lixeira; the six operations each with a tall vitral swatch and count; admin and theme toggle at the bottom. Top: wide glass search field (Ctrl K) and the teal Novo documento button, the primary action. Greeting heading. Main column: Continue de onde parou, then Atualizados recentemente as dense rows with title, one-line summary, category and operation tag, date (fixed furniture). Right column 340px: Por categoria as clickable bars that open the filtered list, then Favoritos.

FORM: Vitral de Brasília, position 1 on my ordered list (chosen as the pick card). seed:8db0c78c0e7b8460. Signature move: the light behind the glass takes the active operation's tone; entering an operation panel recolors the bands with a slow crossfade, and the document reader inherits its operation's light.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

None at direction level.
