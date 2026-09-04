import { Router, type IRouter } from "express";
import { SubmitCorrectionBody, SubmitCorrectionResponse } from "@workspace/api-zod";
import { db, correctionSubmissionsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/corrections", async (req, res): Promise<void> => {
  const parsed = SubmitCorrectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [submission] = await db
    .insert(correctionSubmissionsTable)
    .values(parsed.data)
    .returning({ id: correctionSubmissionsTable.id, createdAt: correctionSubmissionsTable.createdAt });
  res.status(201).json(
    SubmitCorrectionResponse.parse({
      id: submission.id,
      receivedAt: submission.createdAt,
    }),
  );
});

export default router;