import express = require("express");
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

import axios, { AxiosError, AxiosProxyConfig, AxiosRequestConfig, AxiosResponse } from "axios";

import { trim, nap } from "./util.js";
import { MapWaybackCache, NullWaybackCache, WaybackCache, WaybackResponse } from "./caching.js";
import { getConfig } from "./config.js";
import { ClientData, getClientData, handleClientDataUpdate } from "./client.js";
import { postProcessDocument } from "./postprocess.js";
import { logInfo, logOk, logRequest } from "./log.js";
import { applyTemplate, registerTemplate } from "./templating.js";
import { WaybackRateLimiter as WaybackLoadDistributor, checkWaybackStatus } from "./wayback.js";

const config = getConfig();

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
    windowMs: config.rateLimit.window,
    limit: config.rateLimit.limit,
    standardHeaders: "draft-7"
}));

const cache: WaybackCache = config.caching.enabled ? new MapWaybackCache(config.caching.maxSize) : new NullWaybackCache();
const loadDistribution = new WaybackLoadDistributor();

let proxyIdx = 0;

const axiosSettings: AxiosRequestConfig = {
    withCredentials: config.cookies.length > 0,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "Cache-Control": "max-age=0",
        "Accept-Language": "*",
        "Dnt": "1",
        "Priority": "u=0, i",
        "Sec-Ch-Ua": '"Google Chrome";v="129", "Not:A-Brand";v="8", "Chromium";v="129"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": "Windows",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?0",
        "Cookie": config.cookies
    }
}

registerTemplate("index.ejs");
registerTemplate("400.ejs");

app.get("/", (req, res) => {
    res.status(200).send(applyTemplate("index.ejs", {
        config: getClientData(req),
        host: `${req.protocol}://${req.get("host")}`
    }));
});

app.post("/configure", async (req, res) => {
    handleClientDataUpdate(req, res);
    res.redirect("back");
});

app.get(/\/https?:\/\/.+/, async (req, res) => {
    if (req.url.match(/^\/*https?:\/\/[^.]+\//)) {
        // TLD-less target URL detected, this is not an absolute URL
        // ignore the beginning http<s>://
        const filtered = req.url.substring(req.protocol.length + "://".length + 1);

        tryRedirectReferredLink(filtered, req, res);
        return;
    }

    await redirectToArchive(req, res, req.url.substring(1));
});

app.get("*", async (req, res) => {
    tryRedirectReferredLink(req.url, req, res);
});

function tryRedirectReferredLink(url: string, req: express.Request, res: express.Response) {
    if (!req.headers.host) {
        res.status(400).send("HTTP error 400. Reason: your browser isn't sending the Host header.");
        return;
    }
    
    if (req.headers.referer?.startsWith(`${req.protocol}://${req.headers.host}`)) {
        // the client is skipping "https://..." because its requesting a resource that
        // is relative to the hostname that was present in the *referrer*
        const matches = req.headers.referer.match(/\/https?:\/\/.+?(?:\/|$)/);
        if (!matches || matches.length == 0) {
            res.status(400).send("HTTP error 400. Reason: couldn't determine origin from the Referer header");
            return;
        }

        const origin = trim(matches[0], "/");

        // redirect to the actual archival URL
        res.redirect(`${req.protocol}://${req.headers.host}/${origin}${url}`);
    } else {
        res.status(400).send(applyTemplate("400.ejs", {
            host: `${req.protocol}://${req.get("host")}`
        }));
    }
}

async function redirectToArchive(
    req: express.Request,
    res: express.Response,
    url: string
) {
    let closed = false;
    req.on("close", () => closed = true);

    const client = getClientData(req);

    const year = client.targetDate.year.toString();
    const month = client.targetDate.month.toString().padStart(2, "0");
    const day = client.targetDate.day.toString().padStart(2, "0");

    const cacheQuery = cache.tryGet(day, month, year, url);
    if (cacheQuery.found) {
        await sendWaybackResponse(req, res, cacheQuery.value, client);
        return;
    }

    const waybackUrl = `${req.protocol}://web.archive.org/web/${year}${month}${day}000000id_/${url}`;

    let response: AxiosResponse;

    logRequest(`(new, direct) <..> ${url} for ${year}-${month}-${day}`);

    if (!await checkWaybackStatus(url, axiosSettings)) {
        // no such file on wayback's servers
        if (client.fallbackToCurrent) {
            res.redirect(url);
        } else {
            res.status(404).send("This resource hasn't been archived.");
        }

        return;
    }

    await loadDistribution.evaluateCooldown();

    let proxiedThru: string | false;

    let tries = 0;
    while (true) {
        try {
            if (closed)
                return; // user has navigated away

            let proxy: false | AxiosProxyConfig;

            if (tries != 0 && config.proxies.length != 0) {
                const tokens = config.proxies[proxyIdx++ % config.proxies.length].split(":");
                proxiedThru = tokens[0];
                
                proxy = {
                    host: tokens[0],
                    port: parseInt(tokens[1])
                }
            } else {
                proxy = false;
            }

            response = await axios.get(
                waybackUrl,{
                    responseType: "arraybuffer",
                    proxy: proxy,
                    ...axiosSettings
                }
            );
            break;
        } catch (err) {
            if (!(err instanceof AxiosError))
                throw err;

            if (err.status != 404 && err.response == null) {
                if (tries >= 3) {
                    if (client.fallbackToCurrent) {
                        res.redirect(url);
                    } else {
                        res.status(404).send("Couldn't contact the Wayback Machine. You may be rate-limited.");
                    }

                    return;
                }

                // wait a while and try again...
                await nap(300 * (tries + 1), () => closed);

                tries++;
                continue;
            }

            if (client.fallbackToCurrent) {
                res.redirect(url);
            } else {
                res.sendStatus(err.response.status);
            }
    
            return;
        }
    }

    logRequest(`(new, direct) <ok> ${url} for ${year}-${month}-${day} ${proxiedThru ? `(proxy: ${proxiedThru})` : ''}`);

    const contentType = response.headers["content-type"];

    if (contentType && typeof contentType === "string") {
        const wb: WaybackResponse = {
            contentType: contentType,
            data: response.data
        }

        cache.add(day, month, year, url, wb);
        await sendWaybackResponse(req, res, wb, client);
    } else {
        // If content type is not provided by the API, send a generic response
        res.status(500).send("HTTP error 500. Reason: couldn't determine the content type.");
    }
}

async function sendWaybackResponse(
    req: express.Request,
    res: express.Response,
    wb: WaybackResponse,
    client: ClientData
) {
    res.set("Content-Type", wb.contentType);

    if (wb.contentType.startsWith("text")) {
        res.send(postProcessDocument(
            req,
            wb.data.toString(),
            wb.contentType,
            client
        ));
    } else {
        res.send(wb.data);
    }
}

app.listen(config.port, () => {
    logOk(`wayback-gateway is listening on port ${config.port}.`);
    logOk("You may change the active port in the config.json file.");
});
