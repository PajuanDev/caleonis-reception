import type { Locale } from "@/i18n/config"
import { reviewDrafts } from "./review-drafts"
import type { LegalDocument } from "./types"

export type LegalKind = "privacy" | "terms"

export type { LegalBlock, LegalDocument, LegalSection } from "./types"

export const legalDocuments: Record<
  LegalKind,
  Record<Locale, LegalDocument>
> = {
  privacy: reviewDrafts.privacy,
  terms: reviewDrafts.terms,
}

export const getLegalDocument = (kind: LegalKind, locale: Locale) =>
  legalDocuments[kind][locale]
