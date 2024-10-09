import * as fs from "fs";
import * as ejs from "ejs";
import * as path from "path";
import { logError } from "./log.js";
import { minify } from "html-minifier";

const templates = new Map<string, ejs.TemplateFunction>();

export function registerTemplate(name: string) {
    const projRoot = process.env.INIT_CWD ?? process.cwd();
    const tplPath = path.join(projRoot, `./static/${name}`);

    if (!fs.existsSync(tplPath)) {
        logError(`The template '${name}' doesn't exist in the static folder.`);
        process.exit(1);
    }

    if (templates.has(name)) {
        logError(`Attempted to register template '${name}' more than once.`);
        process.exit(1);
    }

    const raw = fs.readFileSync(tplPath, "utf-8");
    templates.set(name, ejs.compile(raw, { rmWhitespace: true }));
}

export function applyTemplate(name: string, data: any) {
    if (!templates.has(name)) {
        logError(`Attepted to apply non-registered template '${name}'.`);
        process.exit(1);
    }

    return minify(templates.get(name)(data), {
        collapseWhitespace: true,
        removeComments: false,
        minifyCSS: {
            compatibility: "ie7",
        },
    });
}