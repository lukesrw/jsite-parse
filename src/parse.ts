/**
 * Node.js modules
 */
import { parse as parseUrl } from "url";
import { IncomingMessage } from "http";
import { once } from "events";

/**
 * Npm packages
 */
import parseCsv from "./modules/csv-parse";
import { parseForm } from "./modules/formidable";
import { parse as parseQuery } from "qs";
import { parseStringPromise as parseXML } from "xml2js";

/**
 * Interfaces
 */
import { ParsedRequest } from "./interfaces/parse";

/**
 * Contents
 */
const DEFAULT_GUESS_ORDER = ["json", "xml", "csv", "query", "url"];

/**
 * Parse some JSON data
 *
 * @param {*} json_data to be parsed
 * @returns {Promise} pending promise for parsed data
 */
export async function json(json_data: any): Promise<any> {
    if (typeof json_data !== "string") {
        json_data = JSON.stringify(json_data);
    }

    return JSON.parse(json_data);
}

/**
 * Parse some XML data
 *
 * @param {*} xml_data to be parsed
 * @returns {Promise} pending promise for parsed data
 */
export async function xml(xml_data: any): Promise<object> {
    if (typeof xml_data !== "string") return xml_data;

    let data = await parseXML(xml_data);

    if (data) return data;

    throw new Error("Unable to parse XML");
}

/**
 * Parse some CSV data
 *
 * @param {*} csv_data to be parsed
 * @param {boolean} [is_strict=false] whether to be strict in pre-validating
 * @returns {Promise} pending promise for parsed data
 */
export async function csv(csv_data: any, is_strict: boolean = false): Promise<any[][]> {
    if (Array.isArray(csv_data)) {
        return csv_data.map(item => (Array.isArray(item) ? item : [item]));
    }

    if (typeof csv_data !== "string") {
        throw new Error("Unable to parse CSV, data isn't a string");
    }

    if (is_strict && !csv_data.includes(",") && !csv_data.includes("\n")) {
        throw new Error("Refusing to parse CSV, single-word data");
    }

    return parseCsv(csv_data);
}

/**
 * Parse some query string data
 *
 * @param {string|null} query_data to be parsed
 * @param {boolean} [is_strict=false] whether to be strict in pre-validating
 * @returns {Promise} Pending promise with parsed query string
 */
export async function query(query_data: string | null, is_strict: boolean = false): Promise<any> {
    /**
     * @see https://github.com/lukesrw/jsite-parse/issues/1
     */
    if (query_data === null && !is_strict) return {};

    if (typeof query_data !== "string") return query_data;

    if (query_data.includes("#")) {
        throw new Error("Refusing to parse query, contains '#'");
    }

    if (is_strict && query_data.startsWith("/")) {
        throw new Error("Refusing to parse query, starts with '/'");
    }

    if (query_data.startsWith("?")) query_data = query_data.substr(1);

    return parseQuery(query_data);
}

/**
 * Parse a URL string
 *
 * @param {*} [url] to be parsed
 * @param {boolean} [is_strict=false] whether to be strict (reject if starts with '/')
 * @returns {Promise} Pending promise with URL
 */
export async function url(url?: any, is_strict: boolean = false): Promise<any> {
    if (typeof url !== "string") return url;

    url = url || "/";

    if (is_strict && !url.startsWith("/")) {
        throw new Error("Refusing to parse URL, doesn't start with '/'");
    }

    return parseUrl(url, true);
}

/**
 * Parse a content type
 *
 * @param {string} content_type to be parsed
 * @returns {string} Parsed content type
 */
export function contentType(content_type: string): string {
    content_type = content_type || "";
    content_type = content_type.split(";")[0].toLowerCase();

    if (content_type.includes("/")) content_type = content_type.split("/")[1];
    if (content_type.includes("+")) content_type = content_type.split("+")[1];

    content_type = content_type.trim();

    return content_type.length ? content_type : "unknown";
}

/**
 * Parse some data (try JSON, then XML, then CSV, then query)
 *
 * @param {*} data to be parsed
 * @param {Array|string} [order] to attempt guesses
 * @returns {Promise} pending promise for parsed data
 */
export async function guess(data: any, order: string[] | string = DEFAULT_GUESS_ORDER): Promise<any> {
    if (typeof data !== "string") return data;

    if (data === "") return {};

    order = order || DEFAULT_GUESS_ORDER;

    if (typeof order === "string") order = [order];

    if (!Array.isArray(order)) {
        throw new Error("Order isn't an array");
    }

    order = order.map(contentType).filter(content_type => Object.prototype.hasOwnProperty.call(exports, content_type));

    if (order.length === 0) {
        throw new Error("Unable to parse");
    }

    try {
        return await exports[order[0]](data, true);
    } catch (ignore) {
        return await guess(data, order.slice(1));
    }
}

/**
 *
 * @param {*} data for type guessing
 * @param {Array|string} [order] to attempt guesses
 * @returns {Promise} pending promise for parsed data type
 */
export async function guessType(data: any, order: string[] | string = DEFAULT_GUESS_ORDER): Promise<string> {
    if (typeof data !== "string") return data;

    if (data === "") return {};

    order = order || DEFAULT_GUESS_ORDER;

    if (typeof order === "string") order = [order];

    if (!Array.isArray(order)) {
        throw new Error("Order isn't an array");
    }

    order = order.map(contentType).filter(content_type => Object.prototype.hasOwnProperty.call(exports, content_type));

    if (order.length === 0) {
        throw new Error("Unable to parse");
    }

    try {
        await exports[order[0]](data, true);

        return order[0];
    } catch (ignore) {
        return await guessType(data, order.slice(1));
    }
}

/**
 * Parse a request object
 *
 * @param {IncomingMessage} request to be parsed
 * @returns {Promise} Pending promise with parsed data
 */
export async function request(request: IncomingMessage): Promise<ParsedRequest> {
    if (!(request instanceof IncomingMessage)) {
        throw new Error("Unable to parse request");
    }

    let method = (request.method || "get").toLowerCase();
    let request_url = await url(request.url);
    let get = await query(request_url.search);
    let data_parsed;

    if (
        Object.prototype.hasOwnProperty.call(request, "headers") &&
        typeof request.headers["content-type"] === "string" &&
        request.headers["content-type"].includes("multipart/form-data")
    ) {
        data_parsed = await parseForm(request);
    } else {
        let data: string = "";
        request.on("data", chunk => (data += chunk));

        await once(request, "end");

        data_parsed = {
            [method]: await guess(data, request.headers["content-type"])
        };
    }

    return Object.assign(data_parsed, get);
}
