import { ServiceOrder } from "../../generated/prisma/client.js";

interface CreateServiceOrderInput {
    deviceId: string;
    reportedProblem: string;
    createdBy: string;
}

interface ListServiceOrdersOptions {
    limit: number | null;
}

interface ListServiceOrdersInput {
    options: ListServiceOrdersOptions;
} 

export type {
    ServiceOrder as ServiceOrderRecord,
    CreateServiceOrderInput,
    ListServiceOrdersInput,
};