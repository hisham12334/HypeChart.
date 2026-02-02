import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import path from 'path';

// Force load env vars here because this file is imported before index.ts runs config()
config({ path: path.resolve(__dirname, '../../.env') });

// 1. DEBUG: Print the config so you can see if it matches dfnvjyu59
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;

console.log("------------------------------------------------");
console.log("[Cloudinary Init] Backend Config:");
console.log(`- Cloud Name: ${cloudName}`); // MUST SAY 'dfnvjyu59'
console.log(`- API Key:    ${apiKey ? apiKey.slice(0, 4) + '...' : 'MISSING'}`);
console.log("------------------------------------------------");

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const deleteImageFromCloudinary = async (imageUrl: string) => {
    if (!imageUrl) return;

    console.log(`[Cloudinary] Request to delete: ${imageUrl}`);

    try {
        // PARSING LOGIC for URL: https://res.cloudinary.com/dfnvjyu59/image/upload/v1766829250/c1nu8o2rren4gusinw1z.png

        const parts = imageUrl.split('/');
        const uploadIndex = parts.indexOf('upload');

        if (uploadIndex === -1) {
            console.error("[Cloudinary] Error: URL does not contain 'upload' segment.");
            return;
        }

        // Get parts after 'upload': ['v1766829250', 'c1nu8o2rren4gusinw1z.png']
        const pathParts = parts.slice(uploadIndex + 1);

        // Remove version 'v1766...' if it exists
        if (pathParts.length > 0 && pathParts[0].match(/^v\d+$/)) {
            pathParts.shift();
        }

        // Remaining is: ['c1nu8o2rren4gusinw1z.png']
        const fullPath = pathParts.join('/');

        // Remove extension (.png): 'c1nu8o2rren4gusinw1z'
        const publicId = fullPath.replace(/\.[^/.]+$/, "");

        console.log(`[Cloudinary] Extracted Public ID: "${publicId}"`);

        // Execute Delete
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            console.log(`[Cloudinary] SUCCESS: Image deleted.`);
        } else {
            console.error(`[Cloudinary] FAILED: Cloudinary returned '${result.result}'.`);
            console.error(`(Hint: Does Public ID '${publicId}' exist in cloud '${cloudName}'?)`);
        }

    } catch (error) {
        console.error("[Cloudinary] CRASH:", error);
    }
};