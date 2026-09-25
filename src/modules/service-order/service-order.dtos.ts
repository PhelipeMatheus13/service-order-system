import { createServiceOrderRequest } from "./service-order.schemas.js";
import { CreateServiceOrderInput } from "./service-order.types.js";

const createServiceOrderDTO = (body: createServiceOrderRequest, createdById: string): CreateServiceOrderInput => ({
    deviceId: body.deviceId,
    reportedProblem: body.reportedProblem,
    createdById
});

export default {
    createServiceOrderDTO,
};