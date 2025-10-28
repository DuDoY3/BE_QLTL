import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { ItemType, Permission } from "@prisma/client";

const MOCK_USER_ID = "user-test-123";

describe("POST /api/v1/items", () => {
  beforeEach(async () => {
    await prisma.fileMetadata.deleteMany();
    await prisma.driveItem.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a new FOLDER successfully", async () => {
    const newFolderData = {
      name: "My Test Folder",
      itemType: ItemType.FOLDER,
    };

    const response = await request(app)
      .post("/api/v1/items")
      .set("x-user-id", MOCK_USER_ID)
      .send(newFolderData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(newFolderData.name);
    expect(response.body.data.itemType).toBe(ItemType.FOLDER);

    const createdItem = await prisma.driveItem.findUnique({
      where: { itemId: response.body.data.itemId },
    });
    expect(createdItem).not.toBeNull();
    expect(createdItem?.name).toBe(newFolderData.name);
  });

  it("should return a 400 error if name is missing", async () => {
    const invalidData = { itemType: ItemType.FOLDER };

    const response = await request(app)
      .post("/api/v1/items")
      .set("x-user-id", MOCK_USER_ID)
      .send(invalidData);

    expect(response.status).toBe(400);
  });

  it("should create a new FILE successfully", async () => {
    const newFileData = {
      name: "My Test File",
      itemType: ItemType.FILE,
      fileMetadata: {
        mimeType: "application/pdf",
        size: 102758,
      },
    };

    const response = await request(app)
      .post("/api/v1/items")
      .set("x-user-id", MOCK_USER_ID)
      .send(newFileData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(newFileData.name);
    expect(response.body.data.itemType).toBe(newFileData.itemType);

    const createdItem = await prisma.driveItem.findUnique({
      where: { itemId: response.body.data.itemId },
    });
    expect(createdItem).not.toBe(null);
    expect(createdItem?.name).toBe(newFileData.name);
  });
});

describe("GET /api/v1/items/:itemId", () => {
  it("should return a single item if a valid ID is provided", async () => {
    const folder = await prisma.driveItem.create({
      data: {
        name: "Folder to find",
        itemType: "FOLDER",
        ownerId: "mock-user",
        permission: Permission.PRIVATE, // <-- Add this
      },
    });

    const response = await request(app).get(`/api/v1/items/${folder.itemId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.itemId).toBe(folder.itemId);
  });

  it("should return a 404 error if the item ID does not exist", async () => {
    const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await request(app).get(`/api/v1/items/${nonExistentId}`);
    expect(response.status).toBe(404);
  });
});

describe("GET /api/v1/items", () => {
  it("should return a list of items within a parent folder", async () => {
    const parentFolder = await prisma.driveItem.create({
      data: {
        name: "Parent",
        itemType: "FOLDER",
        ownerId: "mock-user",
        permission: Permission.PRIVATE,
      },
    });
    await prisma.driveItem.create({
      data: {
        name: "Child 1",
        itemType: "FILE",
        ownerId: "mock-user",
        parentId: parentFolder.itemId,
        permission: Permission.PRIVATE,
      },
    });
    await prisma.driveItem.create({
      data: {
        name: "Child 2",
        itemType: "FOLDER",
        ownerId: "mock-user",
        parentId: parentFolder.itemId,
        permission: Permission.PRIVATE,
      },
    });
    await prisma.driveItem.create({
      data: {
        name: "Another Root Folder",
        itemType: "FOLDER",
        ownerId: "mock-user",
        permission: Permission.PRIVATE,
      },
    });

    const response = await request(app).get(
      `/api/v1/items?parentId=${parentFolder.itemId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0].name).toBe("Child 1");
  });
});

describe("PUT /api/v1/items/:itemId", () => {
  it("should update an item name successfully", async () => {
    const originalItem = await prisma.driveItem.create({
      data: {
        name: "Original Name",
        itemType: "FOLDER",
        ownerId: "mock-user",
        permission: Permission.PRIVATE,
      },
    });

    const updateData = { name: "Updated Name" };

    const response = await request(app)
      .put(`/api/v1/items/${originalItem.itemId}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe(updateData.name);
    expect(response.body.data.itemId).toBe(originalItem.itemId);

    const updatedItemFromDb = await prisma.driveItem.findUnique({
      where: { itemId: originalItem.itemId },
    });
    expect(updatedItemFromDb?.name).toBe(updateData.name);
  });

  it("should return a 404 error if the item to update does not exist", async () => {
    const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
    const updateData = { name: "Updated Name" };

    const response = await request(app)
      .put(`/api/v1/items/${nonExistentId}`)
      .send(updateData);

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/v1/items/:itemId", () => {
  it("should delete an item successfully", async () => {
    const itemToDelete = await prisma.driveItem.create({
      data: {
        name: "Item to be deleted",
        itemType: "FOLDER",
        ownerId: "mock-user",
        permission: Permission.PRIVATE,
      },
    });

    const response = await request(app).delete(
      `/api/v1/items/${itemToDelete.itemId}`,
    );

    expect(response.status).toBe(204);

    const itemFromDb = await prisma.driveItem.findUnique({
      where: { itemId: itemToDelete.itemId },
    });
    expect(itemFromDb).toBeNull();
  });

  it("should return a 404 error if the item to delete does not exist", async () => {
    const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";

    const response = await request(app).delete(
      `/api/v1/items/${nonExistentId}`,
    );

    expect(response.status).toBe(404);
  });

  it("should also delete associated file metadata due to cascading delete", async () => {
    const fileToDelete = await prisma.driveItem.create({
      data: {
        name: "file-with-meta.txt",
        itemType: "FILE",
        ownerId: "mock-user",
        permission: Permission.PRIVATE,
        fileMetadata: {
          create: {
            mimeType: "text/plain",
            size: 12345,
            storagePath: "/path/to/file",
          },
        },
      },
    });

    await request(app).delete(`/api/v1/items/${fileToDelete.itemId}`);

    const metadataFromDb = await prisma.fileMetadata.findUnique({
      where: { itemId: fileToDelete.itemId },
    });
    expect(metadataFromDb).toBeNull();
  });
});
