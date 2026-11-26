import { sendMail } from "../../shared/services/mailer.js";
import type { QuoteEmailPayload } from "./service-order.types.js";

interface SendQuoteToCustomerInput {
    to: string;
    name: string;
    payload: QuoteEmailPayload;
    idempotencyKey: string;
}

const formatBRL = (value: number): string =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const calculateItemTotal = (components: QuoteEmailPayload["serviceOrder"]["quoteItems"][number]["components"]): number =>
    components.reduce((sum, c) => sum + c.quantity * Number(c.unitPrice), 0);

const sendQuoteToCustomer = async ({ to, name, payload, idempotencyKey }: SendQuoteToCustomerInput): Promise<void> => {
    const { device, serviceOrder } = payload;

    const deviceDescription = [device.brand, device.model, device.color]
        .filter(Boolean)
        .join(" ");

    const findingsHtml = serviceOrder.diagnosis?.findings
        .map((f) => `<li>${f.description}${f.repairable ? "" : " <em>(not repairable)</em>"}</li>`)
        .join("") ?? "";

    const quoteItemsHtml = serviceOrder.quoteItems
        .map((item) => {
            const componentsHtml = item.components
                .map((c) => `
                    <li>${c.quantity}x ${c.description} (${c.type.toLowerCase()}) — ${formatBRL(Number(c.unitPrice) * c.quantity)}</li>
                `)
                .join("");

            const itemTotal = calculateItemTotal(item.components);

            return `
                <div>
                    <p><strong>${item.description}</strong> — ${formatBRL(itemTotal)}</p>
                    <ul>${componentsHtml}</ul>
                </div>
            `;
        })
        .join("");

    const quoteTotal = serviceOrder.quoteItems.reduce(
        (sum, item) => sum + calculateItemTotal(item.components),
        0,
    );

    const subject = "Your quote is ready for approval";

    const html = `
        <p>Hi, ${name}!</p>
        <p>We finished the diagnosis of your device and prepared a quote for you.</p>

        <h3>Device</h3>
        <ul>
            <li><strong>Device:</strong> ${deviceDescription}</li>
            ${device.serialNumber ? `<li><strong>Serial number:</strong> ${device.serialNumber}</li>` : ""}
        </ul>

        <h3>Reported problem</h3>
        <p>${serviceOrder.reportedProblem}</p>

        ${findingsHtml
            ? `
                <h3>What we found</h3>
                <ul>${findingsHtml}</ul>
            `
            : ""}

        ${serviceOrder.quoteItems.length > 0
            ? `
                <h3>Quote</h3>
                ${quoteItemsHtml}
                <p><strong>Total: ${formatBRL(quoteTotal)}</strong></p>
            `
            : `<p>No repair items have been quoted for this service order.</p>`}

        <p>To approve or ask questions about this quote, please contact our store.</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendMail({ to, subject, html, idempotencyKey });
};

export { sendQuoteToCustomer };