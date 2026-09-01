import { sendMail } from "../../shared/services/mailer.js";

interface SendConfirmationInput {
    to: string;
    name: string;
    code: string;
}

/**
 * Builds and sends the account activation email. Shared between the
 * user-created subscriber and the (future) resend-code flow, since both
 * need the exact same template.
 */
const sendConfirmationCode = async ({ to, name, code }: SendConfirmationInput): Promise<void> => {
    const subject = "Confirm your registration";
    const html = `
        <p>Hi, ${name}!</p>
        <p>Use the code below to activate your account:</p>
        <h2>${code}</h2>
        <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendMail({ to, subject, html });
};

const resendConfirmationCode = async ({ to, name, code }: SendConfirmationInput): Promise<void> => {
    const subject = "Resend: Confirm your registration";
    const html = `
        <p>Hi, ${name}!</p>
        <p>We're sending you a new activation code as you requested.</p>
        <p>Use the code below to activate your account:</p>
        <h2>${code}</h2>
        <p><strong>Note:</strong> This is your most recent code. Any previous codes you received are no longer valid.</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendMail({ to, subject, html });
};

export { sendConfirmationCode, resendConfirmationCode };