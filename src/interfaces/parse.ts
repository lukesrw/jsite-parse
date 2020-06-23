export interface PartialParsedRequest {
    [method: string]: object;
    files?: any;
}

export interface ParsedRequest extends PartialParsedRequest {
    get: object;
}
