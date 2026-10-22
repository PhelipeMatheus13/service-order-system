import {
    ServiceOrder,
    ServiceOrderStatus,
    ServiceOrderStatusHistory,
    ServiceOrderStatusChangeSource,
    Diagnosis,
    DiagnosisResult,
    Finding,
    Quote,
    QuoteItem,
    QuoteItemComponent,
    QuoteItemComponentType,
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
    createdById: string;
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

interface UpdateFindingInput {
    findingId: string;
    description: string;
    repairable: boolean;
    updatedById: string;
}

interface CompleteDiagnosisInput {
    diagnosisId: string;
    result: DiagnosisResult;
    completedById: string;
}

interface ListFidingsByDiagnosisId {
    diagnosisId: string;
};

interface CreateQuoteInput {
    serviceOrderId: string;
    diagnosisId: string;
    createdById: string;
}

interface CreateQuoteItemInput {
    quoteId: string;
    findingId: string;
    description: string;
    createdById: string;
    components: QuoteItemComponentInput[];
}

interface QuoteItemComponentInput {
    type: QuoteItemComponentType;
    description: string;
    quantity: number;
    unitPrice: number;
}

type QuoteItemWithComponents = QuoteItem & {
    quoteItemComponents: QuoteItemComponent[];
};

interface ListQuotesByServiceOrderIdInput {
    serviceOrderId: string;
};

export {
    ServiceOrderStatus,
    ServiceOrderStatusChangeSource,
    DiagnosisResult,
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
    CreateFindingInput,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    ListFidingsByDiagnosisId,
    Quote as QuoteRecord,
    CreateQuoteInput,
    QuoteItemWithComponents,
    CreateQuoteItemInput,
    ListQuotesByServiceOrderIdInput
};