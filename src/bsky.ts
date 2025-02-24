import {AtpAgent, RichText} from '@atproto/api';
import {RssItem} from "./rss";
import {BlobRef} from "@atproto/lexicon";
import {args} from "./args";

// Setup BlueSky Agent
const agent = new AtpAgent({
    service: 'https://bsky.social',
});

/**
 * Authenticate BlueSky Agent
 */
export async function initialize(): Promise<void> {

    const username = process.env.BSKY_USERNAME;
    const password = process.env.BSKY_PASSWORD;
    if (!username || !password) {
        throw new Error('Environment variables BSKY_USERNAME and BSKY_PASSWORD are required.');
    }
    try {
        await agent.login({identifier: username, password});
        console.info('Authenticated successfully to BSky');
    } catch (error) {
        console.error('Failed to authenticate with BSky:', error);
        throw error;
    }
}

/**
 * Upload an image to BlueSky and get the blob reference
 * @param imageUrl - URL of the image to upload
 * @returns Blob reference string or null if upload fails
 */
export async function uploadImage(imageUrl: URL): Promise<BlobRef | null> {
    try {
        args.verbose && console.log(`Uploading image from URL: ${imageUrl.toString()}`);
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText}`);
            return null;
        }
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.error(`Invalid content type: ${contentType}`);
            return null;
        }
        const blob = await response.blob();

        const uploadResponse = await agent.uploadBlob(blob, {encoding: contentType}); // Adjust encoding based on image type
        args.verbose && console.log('Image uploaded successfully, blob reference:', uploadResponse.data.blob);

        return uploadResponse.data.blob;
    } catch (error) {
        console.error('Error uploading image to BSky:', error);
        return null;
    }
}

/**
 * Create a post on BlueSky
 * @param rssItem
 */
export async function post(rssItem: RssItem): Promise<void> {
    try {
        // RichText for plain text body of the post
        const richText = new RichText({text: rssItem.title});
        await richText.detectFacets(agent);

        // Construct the external embed
        const embed: { $type: 'app.bsky.embed.external'; external: any } = {
            $type: 'app.bsky.embed.external',
            external: {
                uri: rssItem.link?.toString(),
                title: rssItem.title,
                description: rssItem.content || '',
            },
        };

        // If an image (mediaUrl) is available, upload it and add it as a thumbnail
        if (rssItem.mediaUrl) {
            const mediaRef = await uploadImage(rssItem.mediaUrl);
            if (mediaRef) {
                embed.external.thumb = mediaRef;
            } else {
                console.warn('Image upload failed; posting embed without a thumbnail.');
            }
        }

        // Post the content with the external embed
        const response = await agent.post({
            text: richText.text,
            facets: richText.facets,
            embed,
            createdAt: rssItem.pubDate?.toISOString(),
            langs: Array.from(rssItem.languages),
            tags: Array.from(rssItem.categories)
        });

        console.info('Successfully posted to BSky:', response.uri);
    } catch (error) {
        console.error('Error posting to BSky:', error);
    }
}