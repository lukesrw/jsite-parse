/**
 * Node.js modules
 */
import { IncomingMessage } from "http";

/**
 * Npm packages
 */
import { IncomingForm } from "formidable";

/**
 * Interfaces
 */
import { PartialParsedRequest } from "../interfaces/parse";

/**
 * @todo consider making more generic, as a core part of jsite-parse?
 */
export async function parseForm(request: IncomingMessage): Promise<PartialParsedRequest> {
    return new Promise((resolve, reject) => {
        const form = new IncomingForm();
        form.multiples = true;

        let method = (request.method || "get").toLowerCase();

        try {
            return form.parse(request, (error, fields, files) => {
                if (error) {
                    throw new Error(error);
                }

                return resolve(
                    Object.assign(
                        {
                            [method]: fields
                        },
                        Object.values(files).length ? { files } : {}
                    )
                );
            });
        } catch (error) {
            return reject(error);
        }
    });
}
