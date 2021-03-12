"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const processFiles = require("./process.js").processCss;

const args = process.argv.splice(2);
if (args.length === 0) {
    console.log(`

        Usage: tree-shake-css [options] files1 [files2...]

        where
         - files1, files2... are filenames or globs (eg. ./src/**/*.svelte) for that declaration files should be generated
         - options: 
            --out <folder> or -o <folder>: Set an output folder for the type declarations.
            --override: if existing types and js files should be overridden.
            --debug: for debugging only.
            
    `)
} else {
    const files = [];
    const baselines = [];
    let baseline = false;
    let outfolder = "~none~";
    let debug = false;
    let override = false;
    for (let v of args) {

        if (v === "--debug") {
            debug = true;
            continue;
        }
        if (v === "--baselines" || v === "-b") {
            baseline = true;
            continue;
        }


        if (v === "--out" || v === "-o") {
            outfolder = "will get";
            continue;
        }
        if (outfolder === "will get") {
            outfolder = v;
            continue;
        }
        if (v === "--override") {
            override = true;
        }
        if (baseline) {
            baselines.push(v);
        } else {
            files.push(v);
        }
    }

    if (outfolder === "will get") {
        outfolder = "~none~";
    }
    processFiles(files,  outfolder, debug, override);

}
