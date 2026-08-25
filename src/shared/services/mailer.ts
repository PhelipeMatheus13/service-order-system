import nodemailer, { type Transporter } from "nodemailer";
import { getRequiredEnv } from "../config/env.js";
import logger from "../config/logger.js";
import { internal } from "../errors/errors.js";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: getRequiredEnv("SMTP_HOST"),
        port: Number(getRequiredEnv("SMTP_PORT")),
        auth: {
            user: getRequiredEnv("SMTP_USER"),
            pass: getRequiredEnv("SMTP_PASSWORD"),
        },
    });

    return transporter;
};

interface SendMailInput {
    to: string;
    subject: string;
    html: string;
}

/**
 * Sends an email via SMTP. Knows nothing about the caller's domain —
 * the subject/body are fully assembled by the caller (e.g. the
 * user-created subscriber builds the activation email content).
 */
const sendMail = async ({ to, subject, html }: SendMailInput): Promise<void> => {
    try {
        const from = getRequiredEnv("SMTP_FROM");
        await getTransporter().sendMail({ from, to, subject, html });
    } catch (error) {
        logger.error({ err: error }, "Unexpected error while sending email");
        throw internal();
    }
};

export { sendMail };