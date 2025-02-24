import * as rss from './rss';
import {args} from './args';
import * as bsky from './bsky';
import dotenv from 'dotenv'

dotenv.config();

(async () => {
    const urls = process.env.FEED_URLS;
    args.verbose && console.log("Urls: " + urls);
    const feedUrls: string[] = urls?.split(',') || [];
    const items = new Map<string, rss.RssItem>();
    console.log(`Finding feed items with publication date between: ${args.startTime}-${args.endTime}`);
    for (const feedUrl of feedUrls) {
        const feed = await rss.parser.parseURL(feedUrl) as rss.Output<rss.CustomRSSItem>;
        args.verbose && console.log(`Title: ${feed.title}`);
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
    console.log(`[${args.dryRun ? 'DRY RUN' : 'LIVE'}] Posting items: ${items.size}`)
    for (const item of [...items.values()].sort(rss.sortByPubDate())) {
        if (args.dryRun)
        {
            args.verbose && console.log(`[DRY RUN] Posting item: ${item}`);
        }
        else {
            args.verbose && console.log(`[LIVE] Posting item: ${item}`);
            await bsky.post(item);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
})();
