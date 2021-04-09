"use strict";
var css = require('css');
var fs = require("fs-extra")
var path = require("path")
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCss = void 0;

exports.processCss = (files = [], outfolder = "~none~",sourceout = "~none~",noclass="basic",module=false, debug = false, override = true) => {
    let dest = outfolder;
    if (outfolder === "~none~") {
        dest = "./css";
    }
    let destsource = sourceout;
    if (sourceout === "~none~"){
        destsource = "./css/source";
    }
    if (!fs.existsSync(dest)) {
        fs.mkdir(dest,{recursive:true});
    }
    if (!fs.existsSync(destsource)){
        fs.mkdirSync(destsource,{recursive:true});
    }

    let generalComment = "";
    let general = "";

    let comment = "";
    let classes = {};

    for (let i = 0; i < files.length; i++) {
        [generalComment, general, comment, classes] = extractCssFile(files[i], debug,  generalComment, general, comment, classes);
    }


    writeGeneral(general,  dest, destsource,noclass);

    // Todo: make exchange symbols customizable
    const jsify = (s) => {
        return s.replace(/\\3/g,"_")
            .replace(/-/g, "_")
            .replace(/\./g, "_")
            .replace(/\:/g, "_")
            .replace(/\//g, "_")
            .replace(/\\/g, "")
    }

    writeSpecific(classes, dest,destsource, jsify,module);

    if (module){
        writeModule(dest,generalComment,classes,jsify);
    }else{
        //writeAll(dest,classes,jsify);
    }
}

const extractCssFile = (loc,debug,  generalComment, general, comment, classes) => {

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

    return processRules(rules, generalComment, general, comment, classes, "", "")
    
    
}

const rawify = (s)=>{
    return s.replace(/\\3/g,"")
        .replace(/(?<!\\)\./g," ")
        .replace(/\\/g,"")
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
const writeGeneral = (general, dest, destsource,basic) => {

    const enc = { encoding: "utf-8" };
    const toSource = path.relative(dest,destsource);

    fs.writeFileSync(path.join(destsource, basic.toUpperCase() + ".svelte"),
        `<style>
    ${general}

</style>`, enc)
    fs.writeFileSync(path.join(dest, basic + ".js"), 
        `export {default as ${
            basic.split("").map((v,i)=>i===0?v.toUpperCase():v).join("")
        }} from '${path.join(toSource,basic.toUpperCase() + ".svelte")}';`
        , enc
    );

    fs.writeFileSync(path.join(dest,"c.js"),`
    /** combine class strings
     * @type {(...args:string[])=>string}
     * */
    export const c = (...args) => args.join(" ");
    `,enc
    )
}



/** Write the specific css files to the dest folder */
const writeSpecific = (classes, dest,destsource, jsify,module) => {

    const enc = { encoding: "utf-8" };
    const toSource = path.relative(dest,destsource);
    Object.keys(classes).forEach(cl => {

        const jl = jsify(cl);
        const ccl = rawify(cl);
        const file = ccl.replace(/\//g, "-");
        

        
        
        fs.writeFileSync(path.join(destsource, file + ".svelte"),
            `<style>${classes[cl].rule}</style>`, enc)
        fs.writeFileSync(path.join(dest, file +".js"), 
            `import {default as A} from './${path.join(toSource,file+'.svelte')}'` + (!module?`
/** 
* ${ccl}
* 
* @type {string}
* 
* ${classes[cl].comment}
* */
export const ${jl} = false ? A : "${ccl}";`:""), enc);   

        if (module){
            fs.writeFileSync(path.join(folder,"index.d.ts"),
            `/** 
* ${ccl}
* 
* ${classes[cl].comment}
* */
        declare const ${jl} : string;
        export {${jl}};
        `,enc
            );
        }
    })
}

const writeModule = (dest,generalComment,classes,jsify)=>{
    const enc = { encoding: "utf-8" };
    const name = path.basename(dest)
    fs.writeFileSync(path.join(dest,"package.json"),`
    {
        "name": "${name}",
        "version": "1.0.0",
        "description": "Project specific css-svelte files",
        "types": "types.d.ts",
        "author": "tree-shake-css <tree-shake-css@gradientdescent.de>",
        "devDependencies": {
            "svelte": "^3.34.0"
        }
      }
    `)
    fs.writeFileSync(path.join(dest, "types.d.ts"), `
    import SvelteComponentTyped from 'svelte';
    /**
     ${generalComment}
    */
    declare module "${name}/basic"{
        declare class Basic extends SvelteComponentTyped<{},{},{}> {}
        export {Basic}
    }
    declare module "${name}/c"{
        /** combine class strings
        * usage:
        *   <div class={c("class1","class2")}
        * */
        declare const c = (...args : string[]) => string;
    }
    `/* + Object.keys(classes).map(cl=>{
         const jl = jsify(cl);
         const cll = rawify(cl);
     return `declare module "${name + "/" + cll}" {
        /**  ${cll}
         * 
         * ${classes[cl].comment}
         * *//*
        declare const ${jl} : string;
        export {${jl}};
    }`

    }).join("\n")*/, enc);
}


const writeAll = (dest,classes,jsify)=>{
    const enc = { encoding: "utf-8" };
    const name = path.basename(dest);
    const collect = []
    fs.writeFileSync(path.join(dest, "index.js"), 
        Object.keys(classes).map(cl=>{
            const jl = jsify(cl);
            const cll = rawify(cl);
            collect.push(jl);
            return `import {${jl}} from './${cll}';`
        }).join("\n") + 
        "\n" +
        "export const all = " + collect.join(" + \n") + ';',enc);
}