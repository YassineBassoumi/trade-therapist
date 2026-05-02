import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tradesRouter from "./trades";
import insightsRouter from "./insights";
import reportRouter from "./report";
import seedRouter from "./seed";
import streaksRouter from "./streaks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tradesRouter);
router.use(insightsRouter);
router.use(reportRouter);
router.use(seedRouter);
router.use(streaksRouter);

export default router;
