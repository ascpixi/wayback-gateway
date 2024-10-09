import express = require("express");
import { tryParseInt } from "./util.js";

export interface ClientData {
    replaceAbsLinks: boolean;
    fallbackToCurrent: boolean;
    minimizeHtml: boolean;
    targetDate: {
        day: number;
        month: number;
        year: number;
    }
}

export function getClientData(req: express.Request): ClientData {
    return {
        replaceAbsLinks: req.cookies?.replaceAbsLinks == "true",
        fallbackToCurrent: req.cookies?.fallbackToCurrent == "true",
        minimizeHtml: req.cookies?.minimizeHtml == "true",
        targetDate: {
            day: tryParseInt(req.cookies?.targetDay) ?? 1,
            month: tryParseInt(req.cookies?.targetMonth) ?? 1,
            year: tryParseInt(req.cookies?.targetYear) ?? 2005
        }
    }
}

export function handleClientDataUpdate(req: express.Request, res: express.Response) {
    function bindCookie(name: string) {
        if (name in req.body) {
            res.cookie(name, req.body[name]);
        }
    }

    bindCookie("targetDay");
    bindCookie("targetMonth");
    bindCookie("targetYear");
    bindCookie("replaceAbsLinks");
    bindCookie("fallbackToCurrent");
    bindCookie("minimizeHtml");
}

