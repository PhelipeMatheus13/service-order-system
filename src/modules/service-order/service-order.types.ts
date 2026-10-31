import {
    ServiceOrder,
    ServiceOrderStatus,
    ServiceOrderStatusHistory,
    ServiceOrderStatusChangeSource,
    Diagnosis,
    DiagnosisResult,
    Finding,
    Quote,
    QuoteStatus,
    QuoteItem,
    QuoteItemComponent,
    QuoteItemComponentType,
    OutboxQuote,
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
    description: string | null;
    repairable: boolean | null;
    updatedById: string;
}

interface CompleteDiagnosisInput {
    diagnosisId: string;
    result: DiagnosisResult;
    completedById: string;
}

interface ListFidingsByDiagnosisId {
    diagnosisId: string;
}

interface CreateQuoteInput {
    serviceOrderId: string;
    diagnosisId: string;
    createdById: string;
}

interface CreateQuoteItemAndComponentsInput {
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
}

interface ListQuoteItemsByQuoteIdInput {
    quoteId: string;
}

interface UpdateQuoteItemComponentInput {
    componentId: string;
    type: QuoteItemComponentType | null;
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
}

interface UpdateQuoteItemAndComponentsInput {
    quoteItemId: string;
    description: string | null;
    updatedById: string;
    components: UpdateQuoteItemComponentInput[];
}

interface RequestQuoteSubmissionInput {
    quoteId: string;
    submissionRequestedBy: string;
}

interface UpdateQuoteStatusData {
    quoteId: string;
    expectedStatuses: QuoteStatus[];
    toStatus: QuoteStatus;
}

interface QuoteEmailPayload {
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    device: {
        id: string;
        type: string;
        brand: string;
        model: string;
        color: string;
        serialNumber: string | null;
    };
    serviceOrder: {
        id: string;
        reportedProblem: string;
        status: string;
        diagnosis: {
            id: string;
            result: DiagnosisResult | null;
            findings: Array<{
                id: string;
                description: string;
                repairable: boolean;
            }>;
        } | null;
        quoteItems: Array<{
            id: string;
            description: string;
            findingId: string | null;
            components: Array<{
                id: string;
                type: QuoteItemComponentType;
                description: string;
                quantity: number;
                unitPrice: string;
            }>;
        }>;
    }
}

export {
    ServiceOrderStatus,
    ServiceOrderStatusChangeSource,
    DiagnosisResult,
    QuoteStatus,
    QuoteItemComponentType,
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
    CreateQuoteItemAndComponentsInput,
    ListQuotesByServiceOrderIdInput,
    ListQuoteItemsByQuoteIdInput,
    UpdateQuoteItemAndComponentsInput,
    RequestQuoteSubmissionInput,
    UpdateQuoteStatusData,
    OutboxQuote as OutboxQuoteRecord,
    QuoteEmailPayload, 
};