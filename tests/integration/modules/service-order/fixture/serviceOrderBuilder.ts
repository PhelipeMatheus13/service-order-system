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

/**
 * Result of a build. `user`, `customer` and `device` are always present
 * (the domain floor). `serviceOrder`, `diagnosis` and `quote` are optional
 * because they only exist when explicitly requested (directly or via cascade).
 */
export type ServiceOrderScenario = {
    user: User;
    customer: Customer;
    device: Device;
    serviceOrder?: ServiceOrder;
    diagnosis?: Diagnosis;
    findings: Finding[];
    quote?: Quote;
};

/**
 * Test data builder for a ServiceOrder scenario.
 *
 * Contract:
 * - Every `build()` always creates 1 user, 1 customer and 1 device.
 * - `serviceOrder` is created when requested OR when any downstream entity requires it.
 * - `diagnosis` is created when requested OR when a finding requires it.
 * - `finding` can be created N times; all share the same diagnosis and user.
 * - `quote` is created when requested. It is linked to the diagnosis only when one exists.
 * - Each `withX()` (except `withFinding`) can be called at most once — fail-fast.
 * - Call order is irrelevant. Each `ensureX()` resolves its own FKs recursively,
 *   so dependencies are always materialized in FK-safe order.
 */
export class ServiceOrderBuilder {
    private userOptions: UserOptions | null = null;
    private customerOptions: CustomerOptions | null = null;
    private deviceOptions: DeviceOptions | null = null;
    private serviceOrderOptions: ServiceOrderOptions | null = null;
    private diagnosisOptions: DiagnosisOptions | null = null;
    private quoteOptions: QuoteOptions | null = null;
    private readonly findingOptions: FindingOptions[] = [];

    private user: User | null = null;
    private customer: Customer | null = null;
    private device: Device | null = null;
    private serviceOrder: ServiceOrder | null = null;
    private diagnosis: Diagnosis | null = null;
    private quote: Quote | null = null;
    private readonly findings: Finding[] = [];

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
     * Created when requested OR when a finding requires it (defaults satisfy the FK).
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
     * Requests a Quote.
     * Linked to the diagnosis when one exists in the scenario; otherwise `diagnosis_id` stays null (direct flow).
     * Throws if called more than once.
     */
    withQuote(options: QuoteOptions = {}): this {
        this.assertSingle("withQuote", this.quoteOptions);
        this.quoteOptions = options;
        return this;
    }

    async build(): Promise<ServiceOrderScenario> {
        // Domain floor: always created
        const user = await this.ensureUser();
        const customer = await this.ensureCustomer();
        const device = await this.ensureDevice();

        // Dispatch to the deepest entity that was requested. 
        // Each `if` is independent; ensureX resolves dependencies recursively.
        if (this.quoteOptions !== null) {
            await this.ensureQuote();
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
            quote: this.quote ?? undefined,
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

    private async ensureQuote(): Promise<Quote> {
        if (this.quote !== null) return this.quote;
        const serviceOrder = await this.ensureServiceOrder();
        const user = await this.ensureUser();

        let diagnosisId: string | undefined;
        if (this.diagnosisOptions !== null || this.findingOptions.length > 0) {
            const diagnosis = await this.ensureDiagnosis();
            diagnosisId = diagnosis.id;
        }

        this.quote = await this.createQuote(
            serviceOrder.id,
            diagnosisId,
            user.id,
            this.quoteOptions ?? {},
        );
        return this.quote;
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
}