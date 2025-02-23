import * as rss from './rss';
import {args} from './args';
import * as bsky from './bsky';
import dotenv from 'dotenv'

dotenv.config();

(async () => {
    const urls = process.env.FEED_URLS;
    console.log("Urls: " + urls);
    const feedUrls: string[] = urls?.split(',') || [];
    const items = new Map<string, rss.RssItem>();
    for (const feedUrl of feedUrls) {
        const feed = await rss.parser.parseURL(feedUrl) as rss.Output<rss.CustomRSSItem>;
        console.info(`Title: ${feed.title}`);
        feed.items
            .filter(rss.isValidItem)
            .map(rss.mapItem)
            .filter(rss.verifyPubDate(args.startTime, args.endTime))
            .forEach(rssItem => {
                const item = items.get(rssItem.guid) || rssItem;
                item?.addMetadata(feed);
                items.set(rssItem.guid, item);
            }
        );
    }
    if (!args.dryRun) {
        await bsky.initialize();
    }
    for (const item of [...items.values()].sort(rss.sortByPubDate())) {
        if (args.dryRun)
        {
            console.info(`[DRY RUN] Posting item: ${item}`);
        }
        else {
            console.info(`[LIVE] Posting item: ${item}`);
            await bsky.post(item);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
})();
