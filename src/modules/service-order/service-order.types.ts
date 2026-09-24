import { ServiceOrder } from "../../generated/prisma/client.js";

interface CreateServiceOrderInput {
    deviceId: string;
    reportedProblem: string;
    createdBy: string;
}

export type {
    ServiceOrder as ServiceOrderRecord,
    CreateServiceOrderInput,
};