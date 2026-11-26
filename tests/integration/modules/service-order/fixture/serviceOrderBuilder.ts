import type { PrismaClient } from "../../../../../src/generated/prisma/client.js";
import {
    User,
    Role,
    Customer,
    Device,
    ServiceOrder,
    ServiceOrderStatus,
    Diagnosis,
    DiagnosisResult,
    Finding,
    Quote,
    QuoteStatus,
    QuoteItem,
    QuoteItemComponent,
    QuoteItemDecision,
    QuoteItemComponentType,
} from "../../../../../src/generated/prisma/client.js";

type UserOptions = {
    firstName?: string;
    lastName?: string;
    email?: string;
    passwordHash?: string;
    role?: Role;
    active?: boolean;
};

type CustomerOptions = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
};

type DeviceOptions = {
    type?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    imei?: string;
    color?: string;
};

type ServiceOrderOptions = {
    reportedProblem?: string;
    status?: ServiceOrderStatus;
};

type DiagnosisOptions = {
    result?: DiagnosisResult;
    completedAt?: Date;
    completedById?: string;
};

type FindingOptions = {
    description?: string;
    repairable?: boolean;
};

type QuoteOptions = {
    status?: QuoteStatus;
    submittedAt?: Date;
    respondedAt?: Date;
};

type QuoteItemComponentOptions = {
    type?: QuoteItemComponentType;
    description?: string;
    quantity?: number;
    unitPrice?: number;
};

type QuoteItemOptions = {
    description?: string;
    decision?: QuoteItemDecision;
    quoteIndex?: number;
    findingIndex?: number;
    components?: QuoteItemComponentOptions[];
};

/**
 * A QuoteItem together with its components, so tests can navigate the
 * hierarchy without cross-referencing by `quoteItemId`.
 */
type QuoteItemWithComponents = QuoteItem & {
    components: QuoteItemComponent[];
};

/**
 * Result of a build. `user`, `customer` and `device` are always present
 * (the domain floor). `serviceOrder` and `diagnosis` are optional because
 * they only exist when explicitly requested (directly or via cascade).
 * Arrays are always present (possibly empty).
 */
export type ServiceOrderScenario = {
    user: User;
    customer: Customer;
    device: Device;
    serviceOrder?: ServiceOrder;
    diagnosis?: Diagnosis;
    findings: Finding[];
    quotes: Quote[];
    quoteItems: QuoteItemWithComponents[];
};

/**
 * Test data builder for a ServiceOrder scenario.
 *
 * Always created: 1 user, 1 customer, 1 device.
 * Cascade (auto-created on demand with defaults):
 *   serviceOrder → diagnosis → findings, and serviceOrder → quotes → quoteItems
 * Cardinality: findings, quotes, quoteItems are N; everything else is 1.
 *
 * Rules:
 * - Quotes link to the diagnosis when present; otherwise direct flow (null).
 * - Only one non-SUPERSEDED quote per service order (partial unique index).
 *   Use `status: SUPERSEDED` for historical quotes.
 * - quoteItem targets the current quote by default; `quoteIndex` overrides.
 *   Each item gets at least one component (defaults if none passed).
 * - `withX()` throws if called more than once, except `withFinding`, `withQuote`
 *   and `withQuoteItem` (N-methods).
 *
 * Design:
 * - Call order is irrelevant — each `ensureX()` resolves its own FKs recursively.
 * - Structural validity only: FKs, NOT NULL, unique indexes. 
 *   Domain rules (belong to the service layer;
 *   tests asserting rejections rely on the builder being permissive.
 */
export class ServiceOrderBuilder {
    private userOptions: UserOptions | null = null;
    private customerOptions: CustomerOptions | null = null;
    private deviceOptions: DeviceOptions | null = null;
    private serviceOrderOptions: ServiceOrderOptions | null = null;
    private diagnosisOptions: DiagnosisOptions | null = null;
    private readonly findingOptions: FindingOptions[] = [];
    private readonly quoteOptions: QuoteOptions[] = [];
    private readonly quoteItemOptions: QuoteItemOptions[] = [];

    private user: User | null = null;
    private customer: Customer | null = null;
    private device: Device | null = null;
    private serviceOrder: ServiceOrder | null = null;
    private diagnosis: Diagnosis | null = null;
    private readonly findings: Finding[] = [];
    private readonly quotes: Quote[] = [];
    private readonly quoteItems: QuoteItemWithComponents[] = [];

    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Overrides the default user.
     * User is always created as part of the domain floor.
     * Throws if called more than once.
     */
    withUser(options: UserOptions = {}): this {
        this.assertSingle("withUser", this.userOptions);
        this.userOptions = options;
        return this;
    }

    /**
     * Overrides the default customer.
     * Customer is always created as part of the domain floor.
     * Throws if called more than once.
     */
    withCustomer(options: CustomerOptions = {}): this {
        this.assertSingle("withCustomer", this.customerOptions);
        this.customerOptions = options;
        return this;
    }

    /**
     * Overrides the default device.
     * Device is always created as part of the domain floor.
     * Throws if called more than once.
     */
    withDevice(options: DeviceOptions = {}): this {
        this.assertSingle("withDevice", this.deviceOptions);
        this.deviceOptions = options;
        return this;
    }

    /**
     * Requests a ServiceOrder.
     * Created when requested OR when a diagnosis/finding/quote requires it (defaults satisfy the FK chain).
     * Throws if called more than once.
     */
    withServiceOrder(options: ServiceOrderOptions = {}): this {
        this.assertSingle("withServiceOrder", this.serviceOrderOptions);
        this.serviceOrderOptions = options;
        return this;
    }

    /**
     * Requests a Diagnosis.
     * Created when requested OR when a finding/quote requires it (defaults satisfy the FK).
     * Throws if called more than once.
     */
    withDiagnosis(options: DiagnosisOptions = {}): this {
        this.assertSingle("withDiagnosis", this.diagnosisOptions);
        this.diagnosisOptions = options;
        return this;
    }

    /**
     * Adds a Finding.
     * Each finding requires the full chain (ServiceOrder → Diagnosis); created with defaults if not requested.
     * Can be called any number of times.
     */
    withFinding(options: FindingOptions = {}): this {
        this.findingOptions.push(options);
        return this;
    }

    /**
     * Adds a Quote.
     * Each quote links to the diagnosis when one exists in the scenario; otherwise `diagnosis_id` stays null (direct flow).
     * Only one non-SUPERSEDED quote is allowed per service order (partial unique index
     * `quotes_one_current_per_service_order_key`); pass `status: QuoteStatus.SUPERSEDED`
     * for historical quotes.
     * Can be called any number of times.
     */
    withQuote(options: QuoteOptions = {}): this {
        const newStatus = options.status ?? QuoteStatus.DRAFT;
        const willBeCurrent = newStatus !== QuoteStatus.SUPERSEDED;

        if (willBeCurrent) {
            const hasCurrent = this.quoteOptions.some(
                (q) => (q.status ?? QuoteStatus.DRAFT) !== QuoteStatus.SUPERSEDED,
            );
            if (hasCurrent) {
                throw new Error(
                    "withQuote() can only create one non-SUPERSEDED quote per service order " +
                    "(partial unique index `quotes_one_current_per_service_order_key`). " +
                    "Pass `status: QuoteStatus.SUPERSEDED` for historical quotes.",
                );
            }
        }

        this.quoteOptions.push(options);
        return this;
    }

    /**
     * Adds a QuoteItem.
     * Requires a parent quote — if no `withQuote()` was called, a default DRAFT quote is created.
     * Defaults to the current (non-SUPERSEDED) quote; pass `quoteIndex` to target a specific quote.
     * Pass `findingIndex` to link the item to a finding; omit for direct-flow items (`finding_id: null`).
     * At least one component is created per item (defaults applied if none passed).
     * Can be called any number of times.
     */
    withQuoteItem(options: QuoteItemOptions = {}): this {
        this.quoteItemOptions.push(options);
        return this;
    }

    async build(): Promise<ServiceOrderScenario> {
        // Domain floor: always created
        const user = await this.ensureUser();
        const customer = await this.ensureCustomer();
        const device = await this.ensureDevice();

        // Dispatch to the deepest entity that was requested.
        // Each `if` is independent; ensureX resolves dependencies recursively.
        if (this.quoteItemOptions.length > 0) {
            await this.ensureQuoteItems();
            if (this.findingOptions.length > 0) {
                await this.ensureFindings();
            }
            return this.snapshot(user, customer, device);
        }

        if (this.quoteOptions.length > 0) {
            await this.ensureQuotes();
            if (this.findingOptions.length > 0) {
                await this.ensureFindings();
            }
            return this.snapshot(user, customer, device);
        }

        if (this.findingOptions.length > 0) {
            await this.ensureFindings();
            return this.snapshot(user, customer, device);
        }

        if (this.diagnosisOptions !== null) {
            await this.ensureDiagnosis();
            return this.snapshot(user, customer, device);
        }

        if (this.serviceOrderOptions !== null) {
            await this.ensureServiceOrder();
        }

        return this.snapshot(user, customer, device);
    }

    private snapshot(
        user: User,
        customer: Customer,
        device: Device,
    ): ServiceOrderScenario {
        return {
            user,
            customer,
            device,
            serviceOrder: this.serviceOrder ?? undefined,
            diagnosis: this.diagnosis ?? undefined,
            findings: this.findings,
            quotes: this.quotes,
            quoteItems: this.quoteItems,
        };
    }

    /** Guards singleton entities against duplicate `withX()` calls. */
    private assertSingle(method: string, current: unknown): void {
        if (current !== null) {
            throw new Error(
                `${method}() can only be called once per scenario. ` +
                `Create a separate entity manually if you need more than one.`,
            );
        }
    }

    // each `ensureX()` resolves its own dependencies recursively, so the FK chain is always satisfied.
    private async ensureUser(): Promise<User> {
        if (this.user !== null) return this.user;
        this.user = await this.createUser(this.userOptions ?? {});
        return this.user;
    }

    private async ensureCustomer(): Promise<Customer> {
        if (this.customer !== null) return this.customer;
        this.customer = await this.createCustomer(this.customerOptions ?? {});
        return this.customer;
    }

    private async ensureDevice(): Promise<Device> {
        if (this.device !== null) return this.device;
        const customer = await this.ensureCustomer();
        this.device = await this.createDevice(customer.id, this.deviceOptions ?? {});
        return this.device;
    }

    private async ensureServiceOrder(): Promise<ServiceOrder> {
        if (this.serviceOrder !== null) return this.serviceOrder;
        const customer = await this.ensureCustomer();
        const device = await this.ensureDevice();
        const user = await this.ensureUser();
        this.serviceOrder = await this.createServiceOrder(
            customer.id,
            device.id,
            user.id,
            this.serviceOrderOptions ?? {},
        );
        return this.serviceOrder;
    }

    private async ensureDiagnosis(): Promise<Diagnosis> {
        if (this.diagnosis !== null) return this.diagnosis;
        const serviceOrder = await this.ensureServiceOrder();
        const user = await this.ensureUser();
        this.diagnosis = await this.createDiagnosis(
            serviceOrder.id,
            user.id,
            this.diagnosisOptions ?? {},
        );
        return this.diagnosis;
    }

    private async ensureFindings(): Promise<Finding[]> {
        if (this.findings.length > 0) return this.findings;
        if (this.findingOptions.length === 0) return this.findings;
        const diagnosis = await this.ensureDiagnosis();
        const user = await this.ensureUser();
        for (const options of this.findingOptions) {
            this.findings.push(await this.createFinding(diagnosis.id, user.id, options));
        }
        return this.findings;
    }

    private async ensureQuotes(): Promise<Quote[]> {
        if (this.quotes.length > 0) return this.quotes;
        if (this.quoteOptions.length === 0) return this.quotes;

        const serviceOrder = await this.ensureServiceOrder();
        const user = await this.ensureUser();

        // All quotes in the scenario follow the same flow: linked to a diagnosis when
        // one was requested (or implied by findings), otherwise direct-flow
        // (diagnosis_id: null). The decision is shared across all quotes.
        let diagnosisId: string | undefined;
        if (this.diagnosisOptions !== null || this.findingOptions.length > 0) {
            const diagnosis = await this.ensureDiagnosis();
            diagnosisId = diagnosis.id;
        }

        for (const options of this.quoteOptions) {
            this.quotes.push(await this.createQuote(
                serviceOrder.id,
                diagnosisId,
                user.id,
                options,
            ));
        }
        return this.quotes;
    }

    private async ensureQuoteItems(): Promise<QuoteItemWithComponents[]> {
        if (this.quoteItems.length > 0) return this.quoteItems;
        if (this.quoteItemOptions.length === 0) return this.quoteItems;

        // A quoteItem needs a parent quote (FK is NOT NULL). If the caller did not
        // request one, register a default so `ensureQuotes` creates it — same
        // auto-resolve behavior the builder uses for every other required FK.
        if (this.quoteOptions.length === 0) {
            this.quoteOptions.push({});
        }

        const quotes = await this.ensureQuotes();
        const user = await this.ensureUser();

        for (const options of this.quoteItemOptions) {
            const quote = this.resolveQuoteForItem(quotes, options.quoteIndex);
            const wantsFinding = options.findingIndex !== undefined;

            let findingId: string | undefined;
            let inheritedDescription: string | undefined;

            if (wantsFinding) {
                const findings = await this.ensureFindings();
                const finding = findings[options.findingIndex!];
                if (!finding) {
                    throw new Error(
                        `withQuoteItem() findingIndex ${options.findingIndex} is out of range ` +
                        `(only ${findings.length} finding(s) requested).`,
                    );
                }
                findingId = finding.id;
                inheritedDescription = finding.description;
            }

            const description = options.description ?? inheritedDescription ?? "Quote item default description";
            const decision = options.decision ?? QuoteItemDecision.PENDING;

            const item = await this.createQuoteItem(
                quote.id,
                findingId,
                user.id,
                description,
                decision,
            );

            // At least one component per item (defaults applied when none passed).
            const componentOptions = (options.components && options.components.length > 0)
                ? options.components
                : [{}];

            const components: QuoteItemComponent[] = [];
            for (const compOptions of componentOptions) {
                components.push(
                    await this.createQuoteItemComponent(item.id, compOptions),
                );
            }

            this.quoteItems.push({ ...item, components });
        }

        return this.quoteItems;
    }

    private resolveQuoteForItem(quotes: Quote[], quoteIndex?: number): Quote {
        if (quoteIndex !== undefined) {
            const candidate = quotes[quoteIndex];
            if (!candidate) {
                throw new Error(
                    `withQuoteItem() quoteIndex ${quoteIndex} is out of range ` +
                    `(only ${quotes.length} quote(s) requested).`,
                );
            }
            return candidate;
        }

        const current = quotes.find((q) => q.status !== QuoteStatus.SUPERSEDED);
        if (!current) {
            throw new Error(
                "withQuoteItem() found no current (non-SUPERSEDED) quote — " +
                "pass quoteIndex to target a specific quote.",
            );
        }
        return current;
    }

    // --- Row creation (single Prisma call, no recursion) ---
    private async createUser(options: UserOptions): Promise<User> {
        return this.prisma.user.create({
            data: {
                firstName: options.firstName ?? "John",
                lastName: options.lastName ?? "Doe",
                email: options.email ?? "john.doe@example.com",
                passwordHash: options.passwordHash ?? "passwordHash",
                role: options.role ?? Role.ADMIN,
                active: options.active ?? true,
            },
        });
    }

    private async createCustomer(options: CustomerOptions): Promise<Customer> {
        return this.prisma.customer.create({
            data: {
                firstName: options.firstName ?? "Jane",
                lastName: options.lastName ?? "Doe",
                email: options.email ?? "jane.doe@example.com",
                phoneNumber: options.phoneNumber ?? "5521995437105",
            },
        });
    }

    private async createDevice(
        customerId: string,
        options: DeviceOptions,
    ): Promise<Device> {
        return this.prisma.device.create({
            data: {
                customerId,
                type: options.type ?? "SMARTPHONE",
                brand: options.brand ?? "Samsung",
                model: options.model ?? "Galaxy S23",
                // Nullable fields: no default value, only persist what's given.
                serialNumber: options.serialNumber ?? null,
                imei: options.imei ?? null,
                color: options.color ?? "Black",
            },
        });
    }

    private async createServiceOrder(
        customerId: string,
        deviceId: string,
        createdById: string,
        options: ServiceOrderOptions,
    ): Promise<ServiceOrder> {
        return this.prisma.serviceOrder.create({
            data: {
                customerId,
                deviceId,
                createdById,
                reportedProblem: options.reportedProblem ?? "Screen is cracked and touch is not responding.",
                status: options.status ?? ServiceOrderStatus.WAITING_DIAGNOSIS,
            },
        });
    }

    private async createDiagnosis(
        serviceOrderId: string,
        createdById: string,
        options: DiagnosisOptions,
    ): Promise<Diagnosis> {
        return this.prisma.diagnosis.create({
            data: {
                serviceOrderId,
                createdById,
                // All nullable: an unfinished diagnosis has no result yet.
                result: options.result ?? null,
                completedAt: options.completedAt ?? null,
                completedById: options.completedById ?? null,
            },
        });
    }

    private async createFinding(
        diagnosisId: string,
        createdById: string,
        options: FindingOptions,
    ): Promise<Finding> {
        return this.prisma.finding.create({
            data: {
                diagnosisId,
                createdById,
                description: options.description ?? "Battery capacity below expected level",
                repairable: options.repairable ?? true,
            },
        });
    }

    private async createQuote(
        serviceOrderId: string,
        diagnosisId: string | undefined,
        createdById: string,
        options: QuoteOptions,
    ): Promise<Quote> {
        return this.prisma.quote.create({
            data: {
                serviceOrderId,
                // Optional link: null when the quote belongs to the direct flow (no diagnosis).
                diagnosisId: diagnosisId ?? null,
                createdById,
                status: options.status ?? QuoteStatus.DRAFT,
                submittedAt: options.submittedAt ?? null,
                respondedAt: options.respondedAt ?? null,
            },
        });
    }

    private async createQuoteItem(
        quoteId: string,
        findingId: string | undefined,
        createdById: string,
        description: string,
        decision: QuoteItemDecision,
    ): Promise<QuoteItem> {
        return this.prisma.quoteItem.create({
            data: {
                quoteId,
                findingId: findingId ?? null,
                createdById,
                description,
                decision,
            },
        });
    }

    private async createQuoteItemComponent(
        quoteItemId: string,
        options: QuoteItemComponentOptions,
    ): Promise<QuoteItemComponent> {
        return this.prisma.quoteItemComponent.create({
            data: {
                quoteItemId,
                type: options.type ?? QuoteItemComponentType.PART,
                description: options.description ?? "Default component",
                quantity: options.quantity ?? 1,
                unitPrice: options.unitPrice ?? 100,
            },
        });
    }
}