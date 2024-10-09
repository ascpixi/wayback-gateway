import chalk from "chalk";
import { getConfig } from "./config.js";

export function logOk(msg: any) {
    console.log(chalk.green(`[ok]   ${msg}`))
}

export function logInfo(msg: any) {
    console.log(`[info] ${msg}`);
}

export function logError(msg: any) {
    console.log(chalk.red(`[error] ${msg}`));
}

export function logWarning(msg: any) {
    console.log(chalk.yellow(`[warn] ${msg}`));
}

export function logRequest(msg: any) {
    if (getConfig().logNewRequests) {
        console.log(chalk.grey(`[req]  ${msg}`));
    }
}