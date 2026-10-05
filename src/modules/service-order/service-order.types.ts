import { 
    ServiceOrder, 
    ServiceOrderStatus,
    ServiceOrderStatusHistory, 
    ServiceOrderStatusChangeSource 
} from "../../generated/prisma/client.js";

interface CreateServiceOrderInput {
    deviceId: string;
    reportedProblem: string;
    createdById: string;
}

interface ListServiceOrdersOptions {
    limit: number | null;
}

interface ListServiceOrdersInput {
    options: ListServiceOrdersOptions;
} 

interface CreateServiceOrderStatusHistoryInput {
    serviceOrderId: string;
    fromStatus: ServiceOrderStatus | null;
    toStatus: ServiceOrderStatus;
    changeSource: ServiceOrderStatusChangeSource;
    changedById: string | null;
}

export type {
    ServiceOrder as ServiceOrderRecord,
    CreateServiceOrderInput,
    ListServiceOrdersInput,
    ServiceOrderStatusHistory as ServiceOrderStatusHistoryRecord,
    CreateServiceOrderStatusHistoryInput
};