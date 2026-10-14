/**
 * The personas available on a phone.
 *
 * A subset of the web app's list, and the omissions are deliberate rather than
 * unfinished: CodeX needs a file tree, and Catalyst and Crucible need a canvas
 * and a long workspace session. Offering them here would mean a persona that
 * answers in a format the screen cannot show.
 *
 * Ids match the server. `lane` personas pick the engine; the rest shape how it
 * answers.
 */
export type Persona = { id: string; name: string; blurb: string; lane?: boolean }

export const PERSONAS: readonly Persona[] = [
  { id: 'agi-s-1', name: 'AGI-S S-1', blurb: 'The reasoning core. The default.', lane: true },
  { id: 'agi-s-2', name: 'AGI-S S-2', blurb: 'The fast lane. Quicker, lighter.', lane: true },
  { id: 'enhanced', name: 'Enhanced', blurb: 'Fuller answers with more structure.' },
  { id: 'global-search', name: 'Global Search', blurb: 'Answers from the live web, with sources.' },
  { id: 'academic-research', name: 'Academic Research', blurb: 'Literature, citations, method.' },
  { id: 'strategist', name: 'The Strategist', blurb: 'Options, trade-offs, a recommendation.' },
  { id: 'globetrotter', name: 'The Globetrotter', blurb: 'Travel, places, logistics.' },
  { id: 'storyteller', name: 'The Storyteller', blurb: 'Narrative and prose.' },
  { id: 'designer', name: 'The Designer', blurb: 'Visual and product thinking.' },
  { id: 'gourmet', name: 'The Gourmet', blurb: 'Food, cooking, ingredients.' },
  { id: 'forecaster', name: 'The Forecaster', blurb: 'Predictions with stated confidence.' },
  { id: 'comparison-analyst', name: 'Comparison Analyst', blurb: 'Side-by-side, like for like.' },
  { id: 'ethicist', name: 'The Ethicist', blurb: 'The moral shape of a decision.' },
]

export const DEFAULT_PERSONA = 'agi-s-1'

export const findPersona = (id: string | null | undefined): Persona =>
  PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]
