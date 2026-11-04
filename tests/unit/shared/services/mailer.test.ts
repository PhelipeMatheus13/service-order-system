import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";

const { sendMailMock, ResendMock } = vi.hoisted(() => ({
    sendMailMock: vi.fn(),
    ResendMock: vi.fn(),
}));

vi.mock("resend", () => ({
    Resend: ResendMock,
}));

// The mailer keeps a lazy `client` singleton. Reset modules and re-import
// in beforeEach so each test gets a fresh client (client === null).
let sendMail: typeof import("../../../../src/shared/services/mailer.js").sendMail;

describe("Mailer Service (Unit)", () => {
    const originalEnv = { ...process.env };

    const email = {
        to: "user@example.com",
        subject: "Account activation",
        html: "<h1>Activate your account</h1>",
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        sendMailMock.mockReset();
        sendMailMock.mockResolvedValue({ data: { id: "email-1" }, error: null });

        ResendMock.mockReset();
        ResendMock.mockImplementation(function () {
            return { emails: { send: sendMailMock } };
        });

        process.env = {
            ...originalEnv,
            RESEND_API_KEY: "test-api-key",
            EMAIL_FROM: "noreply@example.com",
        };

        const mailerMod = await import("../../../../src/shared/services/mailer.js");
        sendMail = mailerMod.sendMail;

        // env.js runs dotenv.config() on import, which re-populates DEV_EMAIL_TO
        // from .env.test. Strip it after the import so the default `to` is used,
        // unless a specific test opts in (see "should redirect to DEV_EMAIL_TO").
        delete process.env.DEV_EMAIL_TO;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe("sendMail", () => {
        it("should throw an internal error when RESEND_API_KEY is not set", async () => {
            delete process.env.RESEND_API_KEY;

            await expect(sendMail(email)).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
            });

            expect(ResendMock).not.toHaveBeenCalled();
            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it("should throw an internal error when EMAIL_FROM is not set", async () => {
            delete process.env.EMAIL_FROM;

            await expect(sendMail(email)).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
            });

            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it("should throw an internal error when the Resend client throws", async () => {
            sendMailMock.mockRejectedValue(new Error("Network error"));

            await expect(sendMail(email)).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
            });
        });

        it("should throw conflict IDEMPOTENCY_IN_PROGRESS on concurrent_idempotent_requests", async () => {
            sendMailMock.mockResolvedValue({
                data: null,
                error: { name: "concurrent_idempotent_requests", message: "In progress" },
            });

            await expect(
                sendMail({ ...email, idempotencyKey: "quote-123-submission" }),
            ).rejects.toMatchObject({
                code: "IDEMPOTENCY_IN_PROGRESS",
            });
        });

        it("should throw conflict IDEMPOTENCY_CONFLICT on invalid_idempotent_request", async () => {
            sendMailMock.mockResolvedValue({
                data: null,
                error: { name: "invalid_idempotent_request", message: "Key reused with different payload" },
            });

            await expect(
                sendMail({ ...email, idempotencyKey: "quote-123-submission" }),
            ).rejects.toMatchObject({
                code: "IDEMPOTENCY_CONFLICT",
            });
        });

        it("should throw tooManyRequests when Resend returns rate_limit_exceeded", async () => {
            sendMailMock.mockResolvedValue({
                data: null,
                error: { name: "rate_limit_exceeded", message: "Rate limit" },
            });

            await expect(sendMail(email)).rejects.toMatchObject({
                statusCode: 429,
            });
        });

        it("should throw an internal error for any other Resend error", async () => {
            sendMailMock.mockResolvedValue({
                data: null,
                error: { name: "validation_error", message: "Invalid recipient" },
            });

            await expect(sendMail(email)).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
            });
        });

        it("should send an email successfully without an idempotency key", async () => {
            await sendMail(email);

            expect(ResendMock).toHaveBeenCalledWith("test-api-key");
            expect(sendMailMock).toHaveBeenCalledWith(
                {
                    from: "noreply@example.com",
                    to: email.to,
                    subject: email.subject,
                    html: email.html,
                },
                { idempotencyKey: undefined },
            );
        });

        it("should forward the idempotency key when provided", async () => {
            await sendMail({ ...email, idempotencyKey: "quote-123-submission" });

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({ to: email.to }),
                { idempotencyKey: "quote-123-submission" },
            );
        });

        it("should redirect to DEV_EMAIL_TO when set", async () => {
            process.env.DEV_EMAIL_TO = "dev@example.com";

            await sendMail(email);

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({ to: "dev@example.com" }),
                expect.anything(),
            );
        });
    });
});