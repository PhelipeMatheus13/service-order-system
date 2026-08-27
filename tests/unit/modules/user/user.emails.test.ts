import { vi, describe, beforeEach, it, expect } from "vitest";

import { sendConfirmationCode } from "../../../../src/modules/user/user.emails.js";
import { sendMail } from "../../../../src/shared/services/mailer.js";

vi.mock("../../../../src/shared/services/mailer.js", () => ({
    sendMail: vi.fn(),
}));

const sendMailMock = vi.mocked(sendMail);

describe("User Emails (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("sendConfirmationCode", () => {
        it("should propagate the error when sending the email fails", async () => {
            const error = new Error("Fake error");

            sendMailMock.mockRejectedValue(error);

            await expect(
                sendConfirmationCode({
                    to: "user@example.com",
                    name: "John Doe",
                    code: "123456",
                }),
            ).rejects.toThrow(error);
        });
        
        it("should send the account activation email", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendConfirmationCode({
                to: "user@example.com",
                name: "John Doe",
                code: "123456",
            });

            const [mail] = sendMailMock.mock.calls[0];

            expect(mail).toMatchObject({
                to: "user@example.com",
                subject: "Confirm your registration",
            });

            expect(mail.html).toContain("<p>Hi, John Doe!</p>");
            expect(mail.html).toContain("<p>Use the code below to activate your account:</p>");
            expect(mail.html).toContain("<h2>123456</h2>");
            expect(mail.html).toContain("<p>If you didn't request this, please ignore this email.</p>");
        });
    });
});