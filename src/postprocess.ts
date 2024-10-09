import express = require("express");
import { ClientData } from "./client.js";
import { minify } from "html-minifier";

/** MIME types that may be post-processed. */
const filterableTypes = new Set([
    "text/css",
    "text/html",
    "application/xml",
    "application/xhtml+xml",
    "text/javascript",
    "application/javascript",
    "application/ecmascript",
    "application/x-ecmascript",
    "application/x-javascript",
    "text/ecmascript",
    "text/javascript1.0",
    "text/javascript1.1",
    "text/javascript1.2",
    "text/javascript1.3",
    "text/javascript1.4",
    "text/javascript1.5",
    "text/jscript",
    "text/livescript",
    "text/x-ecmascript",
    "text/x-javascript"
]);

export function processAbsLinks(
    host: string,
    contentType: string,
    document: string
) {
    // skip extra information (e.g. the charset from "text/html; charset=utf-8")
    const delimiter = contentType.indexOf(";");
    if (delimiter != -1) {
        contentType = contentType.substring(0, contentType.indexOf(";"));
    }

    if (!filterableTypes.has(contentType))
        return document;

    return document.replace(
        /\b(?:https?:\/\/)[^\s'"]+(?=['"])/gm,
        x => `${host}/${x}`
    );
}

export function postProcessDocument(
    req: express.Request,
    document: string,
    contentType: string,
    client: ClientData
) {
    if (client.replaceAbsLinks) {
        document = processAbsLinks(`${req.protocol}://${req.get("host")}`, contentType, document);
    }

    if (client.minimizeHtml) {
        document = minify(document, {
            collapseWhitespace: true
        });
    }

    return document;
}
