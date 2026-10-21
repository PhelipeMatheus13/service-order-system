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

/**
 * Result of a build. `user`, `customer` and `device` are always present
 * (the domain floor). `serviceOrder` and `diagnosis` are optional because
 * they only exist when explicitly requested (directly or via cascade).
 */
export type ServiceOrderScenario = {
    user: User;
    customer: Customer;
    device: Device;
    serviceOrder?: ServiceOrder;
    diagnosis?: Diagnosis;
    findings: Finding[];
};

/**
 * Test data builder for a ServiceOrder scenario.
 *
 * Contract:
 * - Every `build()` always creates 1 user, 1 customer and 1 device.
 * - `serviceOrder` is created when requested OR when a diagnosis/finding requires it.
 * - `diagnosis` is created when requested OR when a finding requires it.
 * - `finding` can be created N times; all share the same diagnosis and user.
 * - Each `withX()` (except `withFinding`) can be called at most once — fail-fast.
 * - Call order is irrelevant; the build executes in FK-safe order internally.
 */
export class ServiceOrderBuilder {
    private userOptions: UserOptions | null = null;
    private customerOptions: CustomerOptions | null = null;
    private deviceOptions: DeviceOptions | null = null;
    private serviceOrderOptions: ServiceOrderOptions | null = null;
    private diagnosisOptions: DiagnosisOptions | null = null;
    private readonly findingOptions: FindingOptions[] = [];

    constructor(private readonly prisma: PrismaClient) {}

    /** Overrides the default user. Throws if called more than once. */
    withUser(options: UserOptions = {}): this {
        this.assertSingle("withUser", this.userOptions);
        this.userOptions = options;
        return this;
    }

    /** Overrides the default customer. Throws if called more than once. */
    withCustomer(options: CustomerOptions = {}): this {
        this.assertSingle("withCustomer", this.customerOptions);
        this.customerOptions = options;
        return this;
    }

    /** Overrides the default device. Throws if called more than once. */
    withDevice(options: DeviceOptions = {}): this {
        this.assertSingle("withDevice", this.deviceOptions);
        this.deviceOptions = options;
        return this;
    }

    /**
     * Requests a ServiceOrder. If omitted but a diagnosis/finding is requested,
     * one is created with defaults to satisfy the FK chain.
     * Throws if called more than once.
     */
    withServiceOrder(options: ServiceOrderOptions = {}): this {
        this.assertSingle("withServiceOrder", this.serviceOrderOptions);
        this.serviceOrderOptions = options;
        return this;
    }

    /**
     * Requests a Diagnosis. If omitted but a finding is requested,
     * one is created with defaults to satisfy the FK.
     * Throws if called more than once.
     */
    withDiagnosis(options: DiagnosisOptions = {}): this {
        this.assertSingle("withDiagnosis", this.diagnosisOptions);
        this.diagnosisOptions = options;
        return this;
    }

    /** Adds a finding. Can be called any number of times. */
    withFinding(options: FindingOptions = {}): this {
        this.findingOptions.push(options);
        return this;
    }

    async build(): Promise<ServiceOrderScenario> {
        // --- Domain floor: always created ---
        const user = await this.createUser(this.userOptions ?? {});
        const customer = await this.createCustomer(this.customerOptions ?? {});
        const device = await this.createDevice(customer.id, this.deviceOptions ?? {});

        // --- Cascade flags: resolve what else needs to exist ---
        const needsDiagnosis = this.diagnosisOptions !== null || this.findingOptions.length > 0;
        const needsServiceOrder = this.serviceOrderOptions !== null || needsDiagnosis;

        // --- Conditional entities, built in FK-safe order ---
        let serviceOrder: ServiceOrder | undefined;
        if (needsServiceOrder) {
            serviceOrder = await this.createServiceOrder(
                customer.id,
                device.id,
                user.id,
                this.serviceOrderOptions ?? {},
            );
        }

        let diagnosis: Diagnosis | undefined;
        if (needsDiagnosis) {
            // needsDiagnosis implies needsServiceOrder, so serviceOrder is defined.
            diagnosis = await this.createDiagnosis(
                serviceOrder!.id,
                user.id,
                this.diagnosisOptions ?? {},
            );
        }

        const findings: Finding[] = [];
        for (const options of this.findingOptions) {
            // findings only exist when requested, which implies a diagnosis exists.
            findings.push(
                await this.createFinding(diagnosis!.id, user.id, options),
            );
        }

        return { user, customer, device, serviceOrder, diagnosis, findings };
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
                // Both nullable: an unfinished diagnosis has no result yet.
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
                description:options.description ?? "Battery capacity below expected level",
                repairable: options.repairable ?? true,
            },
        });
    }
}