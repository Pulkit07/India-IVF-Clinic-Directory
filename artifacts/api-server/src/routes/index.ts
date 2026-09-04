import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clinicsRouter from "./clinics";
import correctionsRouter from "./corrections";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clinicsRouter);
router.use(correctionsRouter);
router.use(adminRouter);

export default router;
