import { Router, type IRouter } from "express";
import { SubmitCorrectionBody, SubmitCorrectionResponse } from "@workspace/api-zod";
import { save } from "../lib/store";

const router: IRouter = Router();

router.post("/corrections", async (req, res): Promise<void> => {
  const parsed = SubmitCorrectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const submission = await save("correction_submissions", { ...parsed.data });
  res.status(201).json(
    SubmitCorrectionResponse.parse({
      id: submission.id,
      receivedAt: submission.createdAt,
    }),
  );
});

export default router;