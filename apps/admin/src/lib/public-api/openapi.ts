import { buildOpenApiDocument } from "@lobbystack/shared";

/** Product-facing metadata only; the shared paths, scopes and schemas are unchanged. */
export function buildCaleonisOpenApiDocument(input: { serverUrl: string }): Record<string, unknown> {
  const document = structuredClone(buildOpenApiDocument(input));
  const components = document.components as { schemas: { AppointmentCreate: { properties: { staff_id: Record<string, unknown> } } } };
  components.schemas.AppointmentCreate.properties.staff_id.description = "Book with this active staff member. Without it, the receptionist picks one who is free.";
  return {
    ...document,
    info: {
      ...(document.info as Record<string, unknown>),
      title: "Caléonis Receptionist API",
      description: "API développeur existante : appels, contacts, rendez-vous, messages et webhooks. Accès limité à une entreprise par clé. Disponibilité et qualification à vérifier dans votre espace.",
    },
  };
}
