"use strict";
var css = require('css');
var fs = require("fs-extra")
var path = require("path")
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCss = void 0;

exports.processCss = (files = [], outfolder = "~none~", debug = false, override = true) => {
    let dest = outfolder;
    if (outfolder === "~none~") {
        fs.mkdirSync("css");
        dest = "./css";
    }
    if (!fs.existsSync(dest)) {
        fs.mkdir(dest)
    }
    for (let i = 0; i < files.length; i++) {
        extractCssFile(files[i], dest, debug);
    }
}

const extractCssFile = (loc, dest, debug) => {

    const cssfile = fs.readFileSync(loc, { encoding: "utf-8" })

    var obj = css.parse(cssfile);
    if (!obj || !obj.stylesheet) {
        throw ("Parsing of file " + loc + " failed!")
    }
    const rules = obj.stylesheet.rules;
    if (debug) {
        console.log("parsed " + rules.length + " rules from file " + loc);
    }


    // general styles means that not a class is generated.
    let generalComment = "";
    let general = "";


    let comment = "";
    let classes = {};

    [generalComment, general, comment, classes] = processRules(rules, generalComment, general, comment, classes, "", "")

    writeGeneral(general, generalComment, dest);

    // Todo: make exchange symbols customizable
    const jsify = (s) => {
        return s.replace(/\\3/g,"_")
            .replace(/-/g, "_")
            .replace(/\./g, "_")
            .replace(/\:/g, "")
            .replace(/\//g, "_")
            .replace(/\\/g, "")
    }

    writeSpecific(classes, dest, jsify);
}

const ruleToString = (sel, declar, media, mediaend) => {
    return media + ":global(" + sel + ")" +
        css.stringify({ stylesheet: { rules: [{ type: "rule", selectors: ["x"], declarations: declar }] } }).slice(2) + mediaend;
}
const commentToString = (comment, sel, dec, media, mediaend) => {
    return media + comment + "\n" + css.stringify({ stylesheet: { rules: [{ type: "rule", selectors: [sel], declarations: dec }] } }) + mediaend;
}

const processRules = (rules, generalComment, general, comment, classes, media, mediaend) => {
    for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        if (r.type === "comment") {
            // just collect all comment texts;
            comment += "\n" + r.comment.replace(/\*/g, "+");
            continue;
        }

        if (r.type === "rule") {
            let hasGeneral = [];

            for (let sel of r.selectors) {

                if (!sel.startsWith(".")) {
                    //class is not at begining, might be somewhere inside selector

                    const cl = sel.split(selConnects).find(v => v.startsWith("."))

                    if (cl) {
                        //found a class. Only add to first class
                        const c = cl.slice(1);
                        if (classes[c] === undefined) {
                            classes[c] = { rule: ruleToString(sel, r.declarations, media, mediaend), comment: commentToString(comment, sel, r.declarations, media, mediaend) };
                        } else {
                            classes[c].rule += ruleToString(sel, r.declarations, media, mediaend);
                            classes[c].comment += "\n" + commentToString(comment, sel, r.declarations, media, mediaend);
                        }

                    } else {
                        //collect all general selectors
                        hasGeneral.push(sel);
                    }
                    continue;
                }
                const cl = sel.split(selConnects).find(v => v.startsWith("."))

                const c = cl.slice(1);
                if (classes[c] === undefined) {
                    classes[c] = { rule: ruleToString(sel, r.declarations, media, mediaend), comment: commentToString(comment, sel, r.declarations, media, mediaend) };
                } else {
                    classes[c].rule += "\n" + ruleToString(sel, r.declarations, media, mediaend);
                    classes[c].comment += "\n" + commentToString(comment, sel, r.declarations, media, mediaend);
                }
            }
            if (hasGeneral.length > 0) {
                general += "\n" + ruleToString(hasGeneral.join(", "), r.declarations, media, mediaend);
                generalComment += comment;
            }


            comment = "";
            continue;
        }
        if (r.type === "media") {
            [generalComment, general, comment, classes] =
                processRules(r.rules, generalComment, general, comment, classes, media + "@media " + r.media + " {\n", "\n}" + mediaend)
            continue
        }
        if (r.type === "keyframes") {
            general += "\n" + keyframeToString(r, media, mediaend);
            generalComment += comment;
            comment = "";
            continue;
        }
        console.log(rules[i])
    }

    return [generalComment, general, comment, classes]

}

const keyframeToString = (r, media, mediaend) => {
    return media + css.stringify({ stylesheet: { rules: [Object.assign({}, r, { name: "-global-" + r.name })] } }) + mediaend;
}


const selConnects = /(?<!\\)[ <>~+:]/g;

/** Write the general css to the dest folder */
const writeGeneral = (general, generalComment, dest) => {
    const enc = { encoding: "utf-8" };
    fs.writeFileSync(path.join(dest, "Basic.svelte"),
        `<style>
    ${general}

</style>`, enc)
    fs.writeFileSync(path.join(dest, "index.js"), `export {default as Basic} from './Basic.svelte';`, enc);
    fs.writeFileSync(path.join(dest, "index.d.ts"), `
    import SvelteComponentTyped from 'svelte';
    /**
     ${generalComment}
    */
    declare class Basic extends SvelteComponentTyped<{},{},{}> {}
    export {Basic}
    `, enc);
    fs.writeFileSync(path.join(dest,"c.js"),`
    /** combine class strings
     * @type {(...args:string[])=>string}
     * */
    const c = (...args) => args.join(" ");
    `,enc)
}

/** Write the specific css files to the dest folder */
const writeSpecific = (classes, dest, jsify) => {
    const enc = { encoding: "utf-8" };

    Object.keys(classes).forEach(cl => {

        const jl = jsify(cl);
        const pathcl = cl.replace(/\//g, "-").replace(/\\/g, "");
        const folder = path.join(dest, pathcl);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
        fs.writeFileSync(path.join(folder, "css.svelte"),
            `<style>${classes[cl].rule}</style>`, enc)
        fs.writeFileSync(path.join(folder, "index.js"), `import {default as A} from './css.svelte';
/**
* ${cl.replace(/\\/g,"")}
* 
* @type {string}
* 
* ${classes[cl].comment}
* */
export const ${jl} = false ? A : "${cl.replace(/\\/g,"")}";`, enc);        
    })

}


