/**
 * Node.js modules
 */
import { promisify } from "util";
const parseCsvRaw = require("csv-parse");

export default async function parseCsv(input: Buffer | string): Promise<any> {
    return promisify(parseCsvRaw)(input);
}
