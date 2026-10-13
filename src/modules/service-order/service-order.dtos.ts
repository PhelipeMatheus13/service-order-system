import {
    CreateServiceOrderRequest,
    CancelServiceOrderRequest,
    CreateFindingRequest,
    UpdateFindingRequest
} from "./service-order.schemas.js";
import {
    CreateServiceOrderInput,
    CancelServiceOrderInput,
    StartDiagnosisInput,
    CreateFindingInput,
    UpdateFindingInput
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

const createDiagnosisDTO = (serviceOrderId: string, performedById: string): StartDiagnosisInput => ({
    serviceOrderId,
    performedById
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

export default {
    createServiceOrderDTO,
    cancelServiceOrderDTO,
    createDiagnosisDTO,
    createFindingDTO,
    updateFindingDTO,
};