import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";

import { sendMail } from "../../../../src/shared/services/mailer.js";

import nodemailer from "nodemailer";
import logger from "../../../../src/shared/config/logger.js";

vi.mock("nodemailer");
vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Mailer Service (Unit)", () => {
    const originalEnv = { ...process.env };

    const sendMailMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        sendMailMock.mockReset();

        process.env = {
            ...originalEnv,
            SMTP_HOST: "smtp.example.com",
            SMTP_PORT: "587",
            SMTP_USER: "smtp-user",
            SMTP_PASSWORD: "smtp-password",
            SMTP_FROM: "noreply@example.com",
        };

        vi.mocked(nodemailer.createTransport).mockReturnValue({
            sendMail: sendMailMock,
        } as never);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe("sendMail", () => {
        it("should throw if SMTP_FROM is not set", async () => {
            delete process.env.SMTP_FROM;

            await expect(
                sendMail({
                    to: "user@example.com",
                    subject: "Account activation",
                    html: "<h1>Activate your account</h1>",
                }),
            ).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
                message: "Internal server error",
            });

            expect(sendMailMock).not.toHaveBeenCalled();

            expect(logger.error).toHaveBeenCalled();
        });

        it("should throw an internal error when sending fails", async () => {
            const smtpError = new Error("SMTP connection failed");

            sendMailMock.mockRejectedValue(smtpError);

            await expect(
                sendMail({
                    to: "user@example.com",
                    subject: "Account activation",
                    html: "<h1>Activate your account</h1>",
                }),
            ).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
                message: "Internal server error",
            });

            expect(logger.error).toHaveBeenCalledWith(
                { err: smtpError },
                "Unexpected error while sending email",
            );
        });
        
        it("should send an email successfully", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendMail({
                to: "user@example.com",
                subject: "Account activation",
                html: "<h1>Activate your account</h1>",
            });

            expect(sendMailMock).toHaveBeenCalledWith({
                from: "noreply@example.com",
                to: "user@example.com",
                subject: "Account activation",
                html: "<h1>Activate your account</h1>",
            });
        });
    });
});