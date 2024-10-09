import * as fs from "fs";
import { object, number, string, InferType, bool, array } from "yup";

let configCache: WaybackGatewayConfig | null = null;

let configSchema = object({
    port: number().default(8080),
    logNewRequests: bool().default(false),
    cookies: string().default(""),
    proxies: array(string()).default([]),
    requestDelay: number().default(250),
    caching: object({
        enabled: bool().default(true),
        maxSize: number().default(256 * 1024 * 1024) // 256 MiB
    }),
    rateLimit: object({
        window: number().default(60 * 1000),
        limit: number().default(50)
    })
});

export type WaybackGatewayConfig = InferType<typeof configSchema>;

export function reloadConfig() {
    if (!fs.existsSync("./config.json")) {
        fs.writeFileSync("./config.json", "{}");
    }

    const raw = fs.readFileSync("./config.json", "utf-8");
    return configCache = configSchema.validateSync(JSON.parse(raw));
}

export function getConfig() {
    if (configCache != null)
        return configCache;

    return reloadConfig();
}

