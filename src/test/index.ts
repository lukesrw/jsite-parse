/**
 * Node.js modules
 */
import { parse as parseUrl } from "url";

/**
 * Npm packages (for testing)
 */
import chai = require("chai");
import chai_as_expected = require("chai-as-promised");
chai.use(chai_as_expected);

/**
 * Self
 */
import parse = require("../parse");

let tests: {
    [content_type: string]: {
        fail: Array<any>;
        in: Array<any>;
        out: any;
        parse: Function;
    }[];
} = {
    json: [
        {
            fail: ["This isn't JSON", true],
            in: ['{"json":{"this":"is","is":123,"my":{"test":["json","object"]}}}', true],
            out: {
                json: {
                    this: "is",
                    is: 123,
                    my: {
                        test: ["json", "object"]
                    }
                }
            },
            parse: parse.json
        }
    ],
    xml: [
        {
            fail: ["This isn't XML", true],
            in: ["<xml><this>is</this><is>123</is><my><test>xml</test><test>object</test></my></xml>", true],
            out: {
                xml: {
                    this: ["is"],
                    is: ["123"],
                    my: [
                        {
                            test: ["xml", "object"]
                        }
                    ]
                }
            },
            parse: parse.xml
        }
    ],
    csv: [
        {
            fail: ["This isn't a CSV", true],
            in: ["this,is,my\nis,123,test", true],
            out: [
                ["this", "is", "my"],
                ["is", "123", "test"]
            ],
            parse: parse.csv
        }
    ],
    query: [
        {
            fail: ["# This isn't a query string", true],
            in: ["this=is&is=123&my=query data", true],
            out: {
                this: "is",
                is: "123",
                my: "query data"
            },
            parse: parse.query
        }
    ],
    url: [
        {
            fail: ["This isn't a URL", true],
            in: ["/this/is/my/url", true],
            out: parseUrl("/this/is/my/url", true),
            parse: parse.url
        }
    ],
    guess: [] // populated dynamically below
};

Object.keys(tests).forEach(content_type => {
    if (content_type === "guess") return;

    tests.guess.push({
        fail: ["#This cannot be guessed"],
        in: tests[content_type][0].in.slice(0, tests[content_type][0].in.length - 1),
        out: tests[content_type][0].out,
        parse: parse.guess
    });
});

describe("Generic Tests", () => {
    Object.keys(tests).forEach(content_type => {
        let test_name = content_type.toUpperCase();
        if (["query", "guess"].indexOf(content_type) > -1) {
            test_name = test_name.substr(0, 1) + content_type.substr(1);
        }

        tests[content_type].forEach((test, test_i) => {
            context(`${test_name} Test ${test_i + 1}`, () => {
                it("Parsed", () => {
                    return chai.expect(test.parse(...test.in)).to.eventually.deep.equal(test.out);
                });

                it("Returned", () => {
                    return chai.expect(test.parse(test.out)).to.eventually.deep.equal(test.out);
                });

                it("Failed", () => {
                    return chai.expect(test.parse(...test.fail)).to.eventually.rejectedWith();
                });

                if (content_type !== "guess") {
                    it("Guess Type", () => {
                        return chai.expect(parse.guessType(test.in[0])).to.eventually.equal(content_type);
                    });

                    it("Content Type", () => {
                        chai.expect(parse.contentType(`text/something+${content_type}; charset=UTF-8`)).to.equal(
                            content_type
                        );
                    });
                }
            });
        });
    });
});

describe("Specific Tests", () => {
    context("Query", () => {
        /**         *
         * @see https://github.com/lukesrw/jsite-parse/issues/1
         */
        it("Return {} when given null in non-strict mode (default args)", () => {
            return chai.expect(parse.query(null)).to.eventually.deep.equal({});
        });
        it("Return {} when given null in non-strict mode (is_strict arg)", () => {
            return chai.expect(parse.query(null, false)).to.eventually.deep.equal({});
        });
    });
});
