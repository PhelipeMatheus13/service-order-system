import { 
    ServiceOrder, 
    ServiceOrderStatus,
    ServiceOrderStatusHistory, 
    ServiceOrderStatusChangeSource,
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

interface CreateServiceOrderStatusHistoryData {
    serviceOrderId: string;
    fromStatus: ServiceOrderStatus | null;
    toStatus: ServiceOrderStatus;
    changeSource: ServiceOrderStatusChangeSource;
    changedById: string | null;
}

interface CancelServiceOrderInput {
    serviceOrderId: string;
    reason: string;
    cancelById: string;
}

interface CancelServiceOrderData {
    serviceOrderId: string;
    reason: string;
}

export {
    ServiceOrderStatus,
    ServiceOrderStatusChangeSource,
};

export type {
    ServiceOrder as ServiceOrderRecord,
    ServiceOrderStatus as ServiceOrderStatusRecord,
    CreateServiceOrderInput,
    ListServiceOrdersInput,
    ServiceOrderStatusHistory as ServiceOrderStatusHistoryRecord,
    CreateServiceOrderStatusHistoryData,
    CancelServiceOrderInput, 
    CancelServiceOrderData
};