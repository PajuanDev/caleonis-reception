import { createHash } from "node:crypto";

import nodemailer, { type Transporter } from "nodemailer";
import { assertCertificationRecipient } from "@lobbystack/shared";
import { renderTemplate, type TemplateName } from "./templates";
export { renderTemplate, type TemplateName } from "./templates";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string;
  replyTo?: string;
};

export type EmailTemplateInput = { template: TemplateName; to: string; subject: string; variables: Record<string, string>; idempotencyKey?: string; idempotencyCreatedAtMs?: number; from?: string; replyTo?: string };

export class SmtpEmailProvider {
  private readonly transporter: Transporter;
  private readonly config: SmtpConfig;

  constructor(config: SmtpConfig, transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  })) {
    this.config = config;
    this.transporter = transporter;
  }

  async sendTemplate(input: EmailTemplateInput): Promise<{ messageId: string }> {
    assertCertificationRecipient("email", input.to);
    const email = renderTemplate(input.template, input.subject, input.variables);
    // Keep sender, reply-to and the historical retry identity unchanged.
    const replyTo = input.from ? input.replyTo : input.replyTo ?? this.config.replyTo;
    const result = await this.transporter.sendMail({
      from: input.from ?? this.config.from,
      ...(replyTo ? { replyTo } : {}),
      to: input.to,
      subject: input.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
      ...(input.idempotencyKey ? { messageId: `<${createHash("sha256").update(input.idempotencyKey).digest("hex")}@mail.lobbystack.internal>` } : {}),
    });
    return { messageId: result.messageId };
  }
}
