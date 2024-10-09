export function tryParseInt(s: any): number | null {
    if (typeof s == "number")
        return s;

    if (typeof s != "string")
        return null;

    let value = parseInt(s);
    return isNaN(value) ? null : value;
}

// Taken from https://stackoverflow.com/a/26156806/13153269
export function trim(str: string, ch: string) {
    var start = 0, end = str.length;

    while(start < end && str[start] === ch)
        ++start;

    while(end > start && str[end - 1] === ch)
        --end;

    return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

export function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

/**
 * Sleeps for the given amount of milliseconds, periodically calling the given function.
 * If `wakeUpFn` returns `true`, the function does an early return.
 * @param ms The amount of milliseconds to wait.
 * @param wakeUpFn The function to call to check for an early wake-up signal.
 * @param checkPeriod The delay between `wakeUpFn` function calls. Defaults to 100ms.
 * @returns 
 */
export async function nap(ms: number, wakeUpFn: () => boolean, checkPeriod = 100) {
    for (let i = 0; i < ms / checkPeriod; i++) {
        await sleep(checkPeriod);

        if (wakeUpFn())
            return;
    }
}

export function regexIndexOf(text: string, re: RegExp, i = 0) {
    var indexInSuffix = text.slice(i).search(re);
    return indexInSuffix < 0 ? indexInSuffix : indexInSuffix + i;
}
