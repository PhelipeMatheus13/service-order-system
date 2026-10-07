import { CreateServiceOrderRequest, CancelServiceOrderRequest } from "./service-order.schemas.js";
import { CreateServiceOrderInput, CancelServiceOrderInput } from "./service-order.types.js";

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

export default {
    createServiceOrderDTO,
    cancelServiceOrderDTO,
};