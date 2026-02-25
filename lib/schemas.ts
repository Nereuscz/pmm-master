import { z } from "zod";

export const processTranscriptSchema = z.object({
  projectId: z.string().min(1),
  phase: z.enum([
    "Iniciace",
    "Plánování",
    "Realizace",
    "Closing",
    "Gate 1",
    "Gate 2",
    "Gate 3"
  ]),
  framework: z.enum(["Univerzální", "Produktový"]),
  transcript: z.string().min(300).max(50000)
});

export const asanaExportSchema = z.object({
  sessionId: z.string().uuid(),
  asanaProjectId: z.string().min(1),
  idempotencyKey: z.string().min(8),
  title: z.string().min(3),
  sections: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1)
    })
  )
});

export const createProjectSchema = z.object({
  name: z.string().min(3).max(140),
  framework: z.enum(["Univerzální", "Produktový"]),
  phase: z.enum([
    "Iniciace",
    "Plánování",
    "Realizace",
    "Closing",
    "Gate 1",
    "Gate 2",
    "Gate 3"
  ]),
  ownerId: z.string().uuid().optional()
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Musíš poslat alespoň jedno pole k úpravě."
);

export const kbDocumentCreateSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().min(2).max(60),
  source: z.enum(["upload", "sharepoint"]).default("upload"),
  content: z.string().min(20),
  sharepointId: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  visibility: z.enum(["global", "team"]).default("global")
});

export const kbDocumentUpdateSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    category: z.string().min(2).max(60).optional(),
    visibility: z.enum(["global", "team"]).optional(),
    content: z.string().min(20).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "Chybí data pro update.");

export const kbSearchSchema = z.object({
  query: z.string().min(3),
  limit: z.number().int().min(1).max(20).default(8)
});

export const sharepointSyncSchema = z.object({
  sourcePath: z.string().min(1),
  files: z.array(
    z.object({
      sharepointId: z.string().min(1),
      title: z.string().min(3),
      category: z.string().min(2).default("SharePoint"),
      content: z.string().optional(),
      deleted: z.boolean().default(false)
    })
  )
});
