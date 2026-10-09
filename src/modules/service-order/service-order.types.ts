import { 
    ServiceOrder, 
    ServiceOrderStatus,
    ServiceOrderStatusHistory, 
    ServiceOrderStatusChangeSource,
    Diagnosis,
    Finding
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

interface StartDiagnosisInput {
    serviceOrderId: string;
    performedById: string;
}

interface UpdateServiceOrderStatusData {
    serviceOrderId: string;
    expectedStatuses: ServiceOrderStatus[];
    toStatus: ServiceOrderStatus;
}

interface CreateFindingInput {
    diagnosisId: string;
    description: string;
    repairable: boolean;
    createdById: string;
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
    CancelServiceOrderData,
    Diagnosis as DiagnosisRecord,
    StartDiagnosisInput,
    UpdateServiceOrderStatusData,
    Finding as FindingRecord,
    CreateFindingInput
};