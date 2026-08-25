import { sendMail } from "../../shared/services/mailer.js";

interface SendActivationEmailInput {
    to: string;
    name: string;
    code: string;
}

/**
 * Builds and sends the account activation email. Shared between the
 * user-created subscriber and the (future) resend-code flow, since both
 * need the exact same template.
 */
const sendActivationEmail = async ({ to, name, code }: SendActivationEmailInput): Promise<void> => {
    const subject = "Confirm your registration";
    const html = `
        <p>Hi, ${name}!</p>
        <p>Use the code below to activate your account:</p>
        <h2>${code}</h2>
        <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendMail({ to, subject, html });
};

export { sendActivationEmail };