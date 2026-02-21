import { z } from "zod";

const MAX_BLEAT_LENGTH = 280;
const MAX_MEDIA_ATTACHMENTS = 4;

export const createBleatSchema = z.object({
  content: z.string()
    .min(1, "Bleat cannot be empty")
    .max(MAX_BLEAT_LENGTH, `Bleat cannot exceed ${MAX_BLEAT_LENGTH} characters`),
  bleatType: z.enum(["text", "photo", "poll", "event"]).default("text"),
  mediaUrls: z.array(z.string().url()).max(MAX_MEDIA_ATTACHMENTS).optional(),
  parentBleatId: z.string().uuid().optional(),
  rebaaOfId: z.string().uuid().optional(),
  isIncognito: z.boolean().default(false),
  herdId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export const getBleatParams = z.object({
  bleatId: z.string().uuid(),
});

export const getFeedQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type CreateBleatInput = z.infer<typeof createBleatSchema>;
export type GetBleatParams = z.infer<typeof getBleatParams>;
export type GetFeedQuery = z.infer<typeof getFeedQuery>;
