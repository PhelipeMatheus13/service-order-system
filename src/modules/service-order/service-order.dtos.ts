import {
    CreateServiceOrderRequest,
    CancelServiceOrderRequest,
    CreateFindingRequest,
} from "./service-order.schemas.js";
import {
    CreateServiceOrderInput,
    CancelServiceOrderInput,
    StartDiagnosisInput,
    CreateFindingInput,
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

export default {
    createServiceOrderDTO,
    cancelServiceOrderDTO,
    createDiagnosisDTO,
    createFindingDTO,
};