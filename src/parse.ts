/**
 * Npm packages
 */
import parseCsv = require("csv-parse");
import { IncomingForm } from "formidable";
import { parse as parseQuery, ParsedQs } from "qs";
import { parseStringPromise as parseXML } from "xml2js";
import { parse as parseUrl } from "url";
import { IncomingMessage } from "http";

/**
 * Contents
 */
const DEFAULT_GUESS_ORDER = ["json", "xml", "csv", "query", "url"];

/**
 * Parse some JSON data
 *
 * @param {string} json_data to be parsed
 * @returns {Promise} pending promise for parsed data
 */
export function json(json_data: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof json_data !== "string") {
            json_data = JSON.stringify(json_data);
        }

        try {
            return resolve(JSON.parse(json_data));
        } catch (error) {
            return reject(error);
        }
    });
}

/**
 * Parse some XML data
 *
 * @param {string} xml_data to be parsed
 * @returns {Promise} pending promise for parsed data
 */
export function xml(xml_data: any): Promise<object> {
    return new Promise((resolve, reject) => {
        if (typeof xml_data !== "string") return resolve(xml_data);

        return parseXML(xml_data)
            .then(data => (data ? resolve(data) : reject("Unable to parse XML")))
            .catch(reject);
    });
}

/**
 * Parse some CSV data
 *
 * @param csv_data to be parsed
 * @returns {Promise} pending promise for parsed data
 */
export function csv(csv_data: any, is_strict: boolean = false): Promise<Array<Array<any>>> {
    return new Promise((resolve, reject) => {
        if (Array.isArray(csv_data)) {
            return resolve(csv_data.map(item => (Array.isArray(item) ? item : [item])));
        }

        if (typeof csv_data !== "string") {
            return reject("Unable to parse CSV, data isn't a string");
        }

        if (is_strict && !csv_data.includes(",") && !csv_data.includes("\n")) {
            return reject("Refusing to parse CSV, single-word data");
        }

        return parseCsv(csv_data, (error: any, data: any) => (error ? reject(error) : resolve(data)));
    });
}

/**
 * Parse some query string data
 *
 * @param {string} query_data to be parsed
 */
export function query(query_data: string, is_strict: boolean = false): Promise<ParsedQs> {
    return new Promise((resolve, reject) => {
        if (typeof query_data !== "string") return resolve(query_data);

        if (query_data.includes("#")) return reject("Refusing to parse query, contains '#'");

        if (is_strict && query_data.startsWith("/")) return reject("Refusing to parse query, starts with '/'");

        if (query_data.startsWith("?")) query_data = query_data.substr(1);

        return resolve(parseQuery(query_data));
    });
}

/**
 * Parse a URL string
 *
 * @param {string} url to be parsed
 * @param {boolean} [is_strict=false] whether to be strict (reject if starts with '/')
 */
export function url(url?: any, is_strict: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof url !== "string") return resolve(url);

        url = url || "/";

        if (is_strict && !url.startsWith("/")) return reject("Refusing to parse URL, doesn't start with '/'");

        return resolve(parseUrl(url, true));
    });
}

/**
 * Parse a content type
 *
 * @param {string} content_type to be parsed
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
 * @param {string} data to be parsed
 * @param {Array|string} [order] to attempt guesses
 * @returns {Promise} pending promise for parsed data
 */
export function guess(data: any, order: Array<string> | string = DEFAULT_GUESS_ORDER): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof data !== "string") return resolve(data);

        if (data === "") return resolve({});

        order = order || DEFAULT_GUESS_ORDER;

        if (typeof order === "string") order = [order];

        if (!Array.isArray(order)) return reject("Order isn't an array");

        if (
            !order
                .filter(content_type => typeof content_type === "string" && DEFAULT_GUESS_ORDER.includes(content_type))
                .some(content_type => {
                    content_type = contentType(content_type);

                    if (Object.prototype.hasOwnProperty.call(exports, content_type)) {
                        return exports[content_type](data, true)
                            .then(resolve)
                            .catch(() => guess(data, order.slice(1)))
                            .then(resolve)
                            .catch(reject);
                    }

                    return false;
                })
        ) {
            return reject("Unable to parse");
        }
    });
}

export function guessType(data: any, order: Array<string> | string = DEFAULT_GUESS_ORDER): Promise<string> {
    return new Promise((resolve, reject) => {
        if (data === "" || typeof data !== "string") {
            return reject("Unable to guess type (bad data)");
        }

        order = order || DEFAULT_GUESS_ORDER;

        if (typeof order === "string") order = [order];

        if (!Array.isArray(order)) return reject("Order isn't an array");

        if (
            !order
                .filter(content_type => typeof content_type === "string" && DEFAULT_GUESS_ORDER.includes(content_type))
                .some(content_type => {
                    content_type = contentType(content_type);

                    if (Object.prototype.hasOwnProperty.call(exports, content_type)) {
                        return exports[content_type](data, true)
                            .then(() => resolve(content_type))
                            .catch(() => guessType(data, order.slice(1)))
                            .then(resolve)
                            .catch(reject);
                    }

                    return false;
                })
        ) {
            return resolve("unknown");
        }
    });
}

export function request(
    request: IncomingMessage
): Promise<{
    get: object;
    [method: string]: object;
    files?: any;
}> {
    return new Promise((resolve, reject) => {
        if (!(request instanceof IncomingMessage)) {
            return reject("Unable to parse request");
        }

        return url(request.url)
            .then(request_url => query(request_url.search))
            .then(get => {
                let method = (request.method || "get").toLowerCase();

                if (
                    Object.prototype.hasOwnProperty.call(request, "headers") &&
                    typeof request.headers["content-type"] === "string" &&
                    request.headers["content-type"].includes("multipart/form-data")
                ) {
                    const form = new IncomingForm();
                    form.multiples = true;

                    try {
                        return form.parse(request, (error, fields, files) => {
                            if (error) return reject(error);

                            return resolve(
                                Object.assign(
                                    {
                                        [method]: fields,
                                        get
                                    },
                                    Object.values(files).length ? { files } : {}
                                )
                            );
                        });
                    } catch (error) {
                        return reject(error);
                    }
                }

                let data = "";
                request.on("data", chunk => (data += chunk));
                request.on("end", () => {
                    return guess(data, request.headers["content-type"])
                        .then(data => {
                            return {
                                [method]: data,
                                get
                            };
                        })
                        .then(resolve)
                        .catch(reject);
                });
            })
            .catch(reject);
    });
}
