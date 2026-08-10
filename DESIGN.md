# DESIGN.md

## 1. Visual Theme & Philosophy

- **Vibe:** A flat, cozy, and highly intentional botanical canvas. We reject heavy drop shadows, opting instead for clean geometric linework and flat, tactile interactive targets. The visual identity balances a warm digital garden aesthetic with premium software polish.
- **Density:** Medium, balanced, and highly mobile-friendly. Containers use clear but unrushed padding, maintaining high structural readability. Interactive targets are spaced for comfortable touch targets on mobile viewports.
- **Layout Grid:** Structured flat panels with explicit border-based divisions over drop shadows. Focus layouts on simple, clean lines with minimal structural clutter.

## 2. Color Palette & Semantic Roles

Ensure all color implementations strictly reference these tailwind configurations or CSS variables:

### Light Theme (`.light` mode / default)

- **Background:** `bg-[#FDFBF7]` (Linen 50) - Core viewport canvas
- **Primary Panel/Card:** `bg-[#F9F6F0]` (Linen 100) - Individual word containers
- **Primary Text:** `text-[#2C3539]` (Charcoal) - Master typography
- **Secondary/Muted Text:** `text-[#4A5D4E]/70` (Muted Moss)
- **Border/Divider:** `border-[#D0C4B6]` (Clay) - Subtle dividers
- **Primary Active/Button:** `bg-[#4A5D4E]` (Moss) with `text-[#FDFBF7]`
- **Accent Interactive:** `bg-[#D0C4B6]` (Clay) - Milestone growth

### Dark Theme (`.dark` mode)

- **Background:** `bg-[#1A221E]` (Slate Night) - Core viewport canvas
- **Primary Panel/Card:** `bg-[#131815]` (Forest Deep) - Individual word containers
- **Primary Text:** `text-[#F4F4F2]` (Ivory) - Master typography
- **Secondary/Muted Text:** `text-[#A3B19B]/70` (Muted Mint-Green)
- **Border/Divider:** `border-[#4A5D4E]` (Moss) - Subtle dividers
- **Primary Active/Button:** `bg-[#A3B19B]` (Moss Muted) with `text-[#131815]`
- **Accent Interactive:** `text-[#D8E2DC]` (Mint) - Milestone growth

## 3. Typography & Hierarchy

Strictly use the two designated font families to maintain the organic book/garden aesthetic:

- **Display Font Family:** `font-serif` (Merriweather) - For branding, main screen headers, card targets, and story titles.
- **UI/Data Font Family:** `font-sans` (Plus Jakarta Sans) - For buttons, forms, metadata, navigation, and phonetic guides.

### Scale Hierarchy

- **Screen Titles (H1):** `font-serif text-3xl md:text-4xl font-bold tracking-tight`
- **Section Headers (H2):** `font-serif text-xl md:text-2xl font-semibold`
- **Card Primary Text:** `font-serif text-lg md:text-xl font-medium`
- **UI Labels & Action Text:** `font-sans text-sm font-semibold tracking-wide uppercase`
- **Body / Paragraph Text:** `font-sans text-base leading-relaxed`
- **Captions / Phonetic Guides:** `font-sans text-xs md:text-sm tracking-normal`

## 4. Component Rules

### Buttons

- **Primary Button:**
  `font-sans text-sm font-semibold px-4 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] bg-[#4A5D4E] text-[#FDFBF7] hover:bg-[#4A5D4E]/90 dark:bg-[#A3B19B] dark:text-[#131815] dark:hover:bg-[#A3B19B]/90`
- **Secondary / Card Action Button:**
  `font-sans text-xs font-medium px-3 py-1.5 rounded-md border transition-all hover:bg-black/5 dark:hover:bg-white/5 border-[#D0C4B6] text-[#2C3539] dark:border-[#4A5D4E] dark:text-[#F4F4F2]`

### Cards & Containers

- **Standard Panel:**
  `rounded-xl border p-5 bg-[#F9F6F0] border-[#D0C4B6] dark:bg-[#131815] dark:border-[#4A5D4E]`
- **Hoverable Interactive Card:**
  `rounded-xl border p-4 bg-[#F9F6F0] border-[#D0C4B6] dark:bg-[#131815] dark:border-[#4A5D4E] transition-all duration-200 hover:border-[#4A5D4E] dark:hover:border-[#A3B19B] cursor-pointer`

### Inputs & Selectors

- **Text Input & Dropdowns:**
  `font-sans text-sm w-full rounded-lg border px-3.5 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#4A5D4E] dark:focus:ring-[#A3B19B] border-[#D0C4B6] text-[#2C3539] dark:border-[#4A5D4E] dark:text-[#F4F4F2]`

## 5. UI Do's and Don'ts (Anti-Patterns)

- **DO** use clean borders (`border-[#D0C4B6]` or `border-[#4A5D4E]`) instead of dropping shadow utilities (`shadow-md`, `shadow-lg`) to divide sections.
- **DO** enforce consistent corner rounding (`rounded-lg` for controls/inputs, `rounded-xl` for panels/cards) to establish physical hierarchy.
- **DO** wrap character representations in the reader interface with hover tooltip components showing translations and phonetic metadata.
- **DON'T** mix arbitrary custom border colors; strictly map visual elements back to the semantic token pairs defined in section 2.
- **DON'T** introduce heavy, hyper-saturated neon colors. All interactive notifications, accents, and validation indicators must be soft, natural tones (like Moss, Sage, and Soft Mint).

## 6. Design System & Component Ownership

- **Styling:** Tailwind CSS v4 is the styling and responsive-layout system.
- **UI primitives:** Use the local `components/ui` shadcn-style components as
  the application design system. They are backed by Radix UI where accessible
  primitives are useful, and may be extended in-repo to preserve a coherent
  interface.
- **Icons:** Use Lucide icons with visible text labels unless the action is
  universally understood and has an accessible name.
- **Extension rule:** Reuse or improve an existing local primitive before adding
  a dependency or introducing an ad-hoc visual pattern.

## 7. Interaction, Feedback & State Rules

- Never use browser `alert`, `prompt`, or `confirm`. Editing happens in an
  in-app form or dialog; irreversible actions use a clear confirmation dialog.
- Use inline validation and inline workflow status for forms, AI generation,
  streaming chat, loading, and recoverable errors. Use a brief toast only for
  successful, independent mutations such as card edits, archive/restore, or
  deletion.
- Every workflow must describe unavailable actions and provide a recovery path:
  empty collections link to import, unavailable AI generation explains its seed
  requirement, and completed practice links to History.
- Dialogs must be keyboard-operable, focus-managed, labelled, and include a
  visible cancel path. Destructive confirmations must name the affected item and
  state whether the action is irreversible.
- Keep visible focus treatments and meet contrast needs in both themes. Do not
  rely solely on color to convey selected, disabled, error, or completion state.

## 8. Navigation & Responsive Rules

- Desktop navigation may appear in the header. Authenticated mobile views use a
  persistent compact bottom bar for Dashboard, Overstory, Understory, and
  History. Each item must retain a text label and a comfortable tap target.
- Account settings and sign-out stay in the profile menu to avoid crowding the
  primary learning navigation.
- Preserve sufficient bottom padding in page content so the mobile navigation
  never covers actions or form fields.

## 9. Learning-Flow Rules

- The Overstory must show the 3–7 seed requirement before its primary action is
  usable and link back to the Dashboard when there are too few active cards.
- The Understory is a five-turn, focused practice round. The AI opens with the
  first question; the active setting and selected vocabulary are visible before
  the learner responds. Show explicit turn progress throughout the round.
- A completed Overstory or Understory round clearly confirms that it has been
  saved privately and offers History as the next action.
