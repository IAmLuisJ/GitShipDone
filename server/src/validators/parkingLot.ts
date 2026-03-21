import { z } from "zod";

export const createParkingLotSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export const updateParkingLotSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  archived: z.boolean().optional(),
});

export const promoteParkingLotSchema = z.object({
  targetType: z.enum(["milestone", "todo"]),
});
