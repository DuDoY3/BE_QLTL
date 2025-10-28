import { z } from "zod";
import { ItemType, DocumentType } from "@prisma/client";

export const createDriveItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    itemType: z.enum(ItemType),
    parentId: z.uuid().nullable().optional(),
    documentType: z.enum(DocumentType).optional(),
  }),
});

export const getItemSchema = z.object({
  params: z.object({
    itemId: z.uuid("Invalid item ID"),
  }),
});

export const getItemsSchema = z.object({
  query: z.object({
    parentId: z.uuid("Invalid parent ID").optional(),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    itemId: z.uuid("Invalid item ID"),
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      parentId: z.uuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Update body cannot be empty",
    }),
});

export const deleteItemSchema = z.object({
  params: z.object({
    itemId: z.uuid("Invalid item ID"),
  }),
});
