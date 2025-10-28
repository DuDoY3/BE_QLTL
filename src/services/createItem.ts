import { Permission, ItemType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateDriveItemInput } from './driveItem.service';


export async function createItem(data: CreateDriveItemInput, ownerId: string) {
    const { name, parentId, itemType } = data;

    const newItem = await prisma.driveItem.create({
        data: {
            name,
            ownerId,
            parentId,
            itemType,
            permission: Permission.PRIVATE,
            // Conditionally create fileMetadata if the item is a file
            fileMetadata: data.itemType === ItemType.FILE
                ? {
                    create: {
                        mimeType: data.fileMetadata.mimeType,
                        size: data.fileMetadata.size,
                        storagePath: `some/path/${name}`, // Generate a real storage path
                    },
                }
                : undefined,
        },
        include: {
            fileMetadata: true, // Include the metadata in the returned object
        },
    });

    return newItem;
}
