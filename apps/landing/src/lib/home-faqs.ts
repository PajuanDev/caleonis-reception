import { launchCopy } from "@/lib/launch-content"
import type { Locale } from "@/i18n"
export const homeFaqs = [...launchCopy.en.faqs]
export const homeFaqsFr = [...launchCopy.fr.faqs]
export const getHomeFaqs = (locale: Locale) => locale === "fr" ? homeFaqsFr : homeFaqs
