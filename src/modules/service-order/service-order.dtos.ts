import {
    CreateServiceOrderRequest,
    CancelServiceOrderRequest,
    CreateFindingRequest,
    UpdateFindingRequest,
    CompleteDiagnosisRequest,
    CreateQuoteRequest,
    CreateQuoteItemRequest
} from "./service-order.schemas.js";
import {
    CreateServiceOrderInput,
    CancelServiceOrderInput,
    StartDiagnosisInput,
    CreateFindingInput,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    CreateQuoteInput,
    CreateQuoteItemInput
} from "./service-order.types.js";

const createServiceOrderDTO = (body: CreateServiceOrderRequest, createdById: string): CreateServiceOrderInput => ({
    deviceId: body.deviceId,
    reportedProblem: body.reportedProblem,
    createdById
});

const cancelServiceOrderDTO = (body: CancelServiceOrderRequest, serviceOrderId: string, cancelById: string): CancelServiceOrderInput => ({
    serviceOrderId,
    reason: body.reason,
    cancelById
});

const createDiagnosisDTO = (serviceOrderId: string, createdById: string): StartDiagnosisInput => ({
    serviceOrderId,
    createdById
});

const createFindingDTO = (body: CreateFindingRequest, diagnosisId: string, createdById: string): CreateFindingInput => ({
    description: body.description,
    repairable: body.repairable,
    diagnosisId,
    createdById,
});

const updateFindingDTO = (body: UpdateFindingRequest, findingId: string, updatedById: string): UpdateFindingInput => ({
    description: body.description,
    repairable: body.repairable,
    findingId,
    updatedById,
});

const completeDiagnosisDTO = (body: CompleteDiagnosisRequest, diagnosisId: string, completedById: string): CompleteDiagnosisInput => ({
    result: body.result,
    diagnosisId,
    completedById,
});

const createQuoteDTO = (body: CreateQuoteRequest, serviceOrderId: string, createdById: string): CreateQuoteInput => ({
    diagnosisId: body.diagnosisId,
    serviceOrderId,
    createdById,
});

const createQuoteItemDTO = (body: CreateQuoteItemRequest, quoteId: string, createdById: string): CreateQuoteItemInput => ({
    quoteId,
    findingId: body.findingId,
    description: body.description,
    createdById,
    components: body.components
});


export default {
    createServiceOrderDTO,
    cancelServiceOrderDTO,
    createDiagnosisDTO,
    createFindingDTO,
    updateFindingDTO,
    completeDiagnosisDTO,
    createQuoteDTO,
    createQuoteItemDTO,
};