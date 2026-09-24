import { createServiceOrderRequest } from "./service-order.schemas.js";
import { CreateServiceOrderInput } from "./service-order.types.js";

const createServiceOrderDTO = (body: createServiceOrderRequest, createdBy: string): CreateServiceOrderInput => ({
    deviceId: body.deviceId,
    reportedProblem: body.reportedProblem,
    createdBy
});

export default {
    createServiceOrderDTO,
};