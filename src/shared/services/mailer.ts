import { Resend } from "resend";
import { getEnv, getRequiredEnv } from "../config/env.js";
import { conflict, internal, tooManyRequests } from "../errors/errors.js";

let client: Resend | null = null;

const getClient = (): Resend => {
    if (client) return client;
    client = new Resend(getRequiredEnv("RESEND_API_KEY"));
    return client;
};

interface SendMailInput {
    to: string;
    subject: string;
    html: string;
    idempotencyKey?: string;
}

/**
 * Sends an email through the Resend API.
 * The caller builds the subject and HTML — this module knows nothing about the domain.
 * It does not log nor decide what to do on failure: it only reports what happened,
 * and the caller (which has the context) decides.
 */
const sendMail = async ({ to, subject, html, idempotencyKey }: SendMailInput): Promise<void> => {
    let error: Awaited<ReturnType<Resend["emails"]["send"]>>["error"];

    try {
        const from = getRequiredEnv("EMAIL_FROM");

        // no verified domain on Resend yet, so it only delivers to the account owner's email.
        // Set DEV_EMAIL_TO locally to redirect every email. REMOVE this (and the env var)
        // once a domain is verified, otherwise all emails go to the same address.
        const recipient = getEnv("DEV_EMAIL_TO") ?? to;

        ({ error } = await getClient().emails.send(
            { from, to: recipient, subject, html },
            { idempotencyKey },
        ));
    } catch {
        throw internal();
    }

    if (!error) return;

    switch (error.name) {
        case "concurrent_idempotent_requests":
            throw conflict({
                code: "IDEMPOTENCY_IN_PROGRESS",
                message: "A request with the same idempotency key is still being processed",
            });

        case "invalid_idempotent_request":
            throw conflict({
                code: "IDEMPOTENCY_CONFLICT",
                message: "Idempotency key reused with a different payload",
            });

        case "rate_limit_exceeded":
            throw tooManyRequests();

        default:
            throw internal();
    }
};

export { sendMail };