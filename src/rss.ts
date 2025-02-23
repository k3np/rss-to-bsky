import Parser, {Item, Output} from 'rss-parser';

export interface CustomRSSItem extends Item {
    'media:content'?: {
        $: {
            url?: string;
        };
    };
}

export interface CustomRSSFeed extends Output<CustomRSSItem> {
    language?: string;
}

export const parser = new Parser<CustomRSSFeed, CustomRSSItem>({
    customFields: {
        feed: ['language'],
        item: [
            ['media:content', 'media:content', {keepArray: false}],
        ],
    }
});

export class RssItem {
    guid: string;
    title: string;
    link: URL | undefined;
    pubDate: Date | undefined;
    content: string;
    mediaUrl: URL | undefined;
    languages: Set<string>;
    categories: Set<string>;

    constructor(guid: string, title: string, link: URL | undefined, pubDate: Date | undefined, content: string, mediaUrl: URL | undefined) {
        this.guid = guid;
        this.title = title;
        this.link = link;
        this.pubDate = pubDate;
        this.content = content;
        this.mediaUrl = mediaUrl;
        this.languages = new Set();
        this.categories = new Set();
    }

    static from(customRSSItem: CustomRSSItem) {
        return new RssItem(
            customRSSItem.guid ?? '',
            customRSSItem.title?.trim() ?? '',
            customRSSItem.link ? new URL(customRSSItem.link) : undefined,
            customRSSItem.pubDate ? new Date(customRSSItem.pubDate) : undefined,
            customRSSItem.content?.trim() ?? '',
            customRSSItem["media:content"]?.$.url ? new URL(customRSSItem["media:content"].$.url) : undefined,
        )
    }

    addMetadata(feed: CustomRSSFeed) {
        this.languages.add(feed.language ?? '');
        this.addCategories(feed.title?.split(/[^a-zA-ZæøåÆØÅ0-9]/) ?? []);
    }

    addCategories(category: string[]) {
        category
            .map(c => c.trim().toLowerCase())
            .filter(c => c.length > 0)
            .forEach(c => this.categories.add(c));
    }


    /**
     * Converts the RssItem object to a string representation.
     *
     * @return {string} A string representation of the RssItem object.
     */
    toString(): string {
        return `RssItem {
            guid: '${this.guid}',
            title: '${this.title}',
            link: '${this.link?.toString() ?? 'undefined'}',
            pubDate: '${this.pubDate?.toISOString() ?? 'undefined'}',
            content: '${this.content}',
            mediaUrl: '${this.mediaUrl?.toString() ?? 'undefined'}',
            languages: [${[...this.languages].join(', ')}],
            categories: [${[...this.categories].join(', ')}]
        }`;
    }
}

/**
 * Maps a CustomRSSItem object to an RssItem object.
 *
 * @param {CustomRSSItem} item - The RSS item to be mapped, which contains data from the RSS feed.
 * @return {RssItem} A newly created RssItem object with mapped properties from the given CustomRSSItem.
 */
export const mapItem = (item: CustomRSSItem): RssItem => {
    return RssItem.from(item);
}

/**
 * Type guard to check if a value is defined.
 * @param value The value to check.
 * @returns True if the value is defined, false otherwise.
 */
const isDefined = <T>(value: T | undefined | null): value is T => {
    return value !== undefined && value !== null;
};

/**
 * Verifies if the publication date of an RSS item falls within the specified time range.
 *
 * @param {Date} startTime - The start time of the acceptable range for publication dates.
 * @param {Date} endTime - The current time, acting as the end of the acceptable range for publication dates.
 * @return {(rssItem: RssItem) => boolean} A function that accepts an RssItem and returns true if its publication date is within the range, or false otherwise.
 */
export const verifyPubDate = (startTime: Date, endTime: Date): (rssItem: RssItem) => boolean => {
    return (rssItem: RssItem) => {
        if (!isDefined(rssItem.pubDate)) {
            console.warn(`Undefined PubDate: '${rssItem.title}'`);
            return false;
        } else if (rssItem.pubDate <= startTime) {
            console.debug(`[${rssItem.pubDate.toISOString()}] Too old PubDate: ${rssItem.title}`);return false;
        } else if (rssItem.pubDate > endTime) {
            console.debug(`[${rssItem.pubDate.toISOString()}] Too new PubDate: ${rssItem.title}`);
            return false;
        }
        return true;
    };
}

export function sortByPubDate() {
    return (a:RssItem, b:RssItem) => (a.pubDate?.getTime() || 0) - (b.pubDate?.getTime() || 0);
}

/**
 * Determines whether a CustomRSSItem contains all required fields: guid, title, and link.
 * Logs a warning if the item is invalid.
 *
 * @param item The RSS item to validate.
 * @return {boolean} True if the item contains all required fields, false otherwise.
 */
export const isValidItem = (item: CustomRSSItem): boolean => {
    if (!item.guid || !item.title || !item.link) {
        console.warn(`Invalid item: ${JSON.stringify(item, null, 2)}`);
        return false;
    }
    return true;
}

export {Output};
