# Installation

NPM

```
npm install jsite-parse
```

# Usage

Each parser is exported as a seperate function, with the name of the function being the name of the content type (rename to suit your style).

Syntax is the same for each parser.

-   "url" returns the same as [url.parse](https://nodejs.org/api/url.html#url_url_parse_urlstring_parsequerystring_slashesdenotehost)
-   "contentType" parses media (MIME) type strings into content types (see below)
-   "request" returns the data from the request (GET/POST arguments, files, see below)

```js
const { json, xml, csv, query, url } = require("jsite-parse");

// Promise
json(input)
    .then(data => {
        // data
    })
    .catch(error => {
        // error
    });

// Await
try {
    let data = await json(input);
    // data
} catch (error) {
    // error
}
```

# Content Type

The "contentType" function can be used to parse media (MIME) types into content types, so that inbound HTTP requests can be inspected to see what kind of content they are sending.

For example, all of the following are "JSON":

-   application/json
-   application/ld+json
-   application/vnd.api+json

This is used to normalize "order" input for the guess functions.

# Request

The "request" function can be used to parse HTTP requests into data, returning an object that always contains "get", it will also contain a property for the type of request (i.e. "post", "put", etc.) - if files were sent, these will also be included.

## Examples

GET request, with URL arguments:

```json
{
    "get": {
        "url": "123",
        "argument": "456"
    }
}
```

POST request, without URL arguments:

```json
{
    "get": {},
    "post": {
        "post": "123",
        "argument": "456"
    }
}
```

---

# Guessing?

You've been sent some data, but you don't know what content type it is.

For this, we've got "guess" and "guessType" functions.

-   "guess" is given data - and returns parsed data.
-   "guessType" is given data - and returns the assumed type of data.

Each takes two arguments, the data - and an optional type (like a Content-Type header) - as sometimes data received doesn't match the Content-Type received.

## Usage

You don't provide us with a known type, so we'll try them all\*.

```js
const { guess } = require("jsite-parse");

// Promise
guess(input)
    .then(data => {
        // data
    })
    .catch(error => {
        // error
    });

// Await
try {
    let data = await guess(input);
    // data
} catch (error) {
    // error
}
```

You provide us with a known type (one or more), if it works - great, if not, we'll try them all\*.

```js
const { guess } = require("jsite-parse");

// Promise
guess(input, "json")
    .then(data => {
        // data
    })
    .catch(error => {
        // error
    });

// Await
try {
    let data = await guess(input, "json");
    // data
} catch (error) {
    // error
}
```

\*all of the built-in functions, in a specific order
