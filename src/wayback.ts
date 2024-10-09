import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { sleep } from "./util.js";
import { getConfig } from "./config.js";

/**
 * Checks if the given URL at the given timestamp is available from Wayback Machine's servers.
 * @param url 
 * @param axiosSettings 
 * @returns 
 */
export async function checkWaybackStatus(url: string, axiosSettings: AxiosRequestConfig = {}) {
    let result: AxiosResponse;
    
    try {
        result = await axios.get(
            `https://archive.org/wayback/available?url=${url}`,
            { responseType: "json", ...axiosSettings }
        );
    } catch (err) {
        return false;
    }
    
    return "archived_snapshots" in result.data &&
        Object.keys(result.data.archived_snapshots).length != 0;
}

export class WaybackRateLimiter {
    /** Determines when the last request will finish. */
    last: number = 0;

    async evaluateCooldown() {
        const q = getConfig().requestDelay;

        if (this.last + q < Date.now()) {
            this.last = Date.now(); // request will finish now
            return;
        }

        this.last += q;
        await sleep(this.last - Date.now());
    }
}