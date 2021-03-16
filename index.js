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
            --out <folder> or -o <folder>: Set an output folder for the css file project. Default "css".
            --sourceout <folder> or -so <folder>: Set an extra folder for the source .svelte files. Default "css/source"
            --override: if existing files should be overridden.
            --debug: for debugging only.
            --module: if it should be exported as module
            --noclass <name>: how the js object should be named which captures the css code which is not structured into classes. Default: "basic"
            
    `)
} else {
    const files = [];
    const baselines = [];
    let baseline = false;
    let outfolder = "~none~";
    let sourceout = "~none~";
    let debug = false;
    let override = false;
    let module = false;
    let noclass = "basic";

    
    
    for (let i=0;i<args.length;i++) {
        const v = args[i];
        if (v === "--debug") {
            debug = true;
            continue;
        }
        if (v === "--baselines" || v === "-b") {
            baseline = true;
            continue;
        }

        if (v === "--out" || v === "-o") {
            outfolder = args[++i];
            continue;
        }
        
        if (v === "--sourceout" || v === "-so") {
            sourceout = args[++i];
            continue;
        }
        if (v === "--noclass"){
            noclass = args[++i];
        }
        if (v === "--override") {
            override = true;
            continue;
        }
        if (v=== "--module"){
            module=true;
            continue;
        }
        if (baseline) {
            baselines.push(v);
        } else {
            files.push(v);
        }

    }

    processFiles(files,  outfolder,sourceout,noclass,module,  debug, override);

}
