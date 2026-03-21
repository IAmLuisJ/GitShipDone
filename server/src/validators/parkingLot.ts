import { z } from "zod";

export const createParkingLotSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});
