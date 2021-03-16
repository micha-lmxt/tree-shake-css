# tree-shake-css

Write out your large css file into a single `.svelte` file per class to use tree-shaking capabilities of rollup or webpack.

## Introduction

Frameworks like Tailwind provide you a large css file with a ton of classes which you don't need in your deployed website. Often they also provide postcss plugins to purge the css file, which means that on build a process searches through your code to find those css-classes, you actually use in your project. `tree-shake-css` proposes an alternative process for Svelte projects. Classes are transformed into `.svelte` files so that you can make use of the tree-shaking capabilities of rollup or webpack. This means you don't need to add complexity to your rollup/webpack process to purge your css file, since only inbuilt Svelte features are used. All used classes end up in the svelte css bundle. This can also shorten your build times.

## Usage

### Installation

Into your project you generate or download a full-feature css file, let's assume it is in the root `./my-large-css-file.css`. Now you can use npx:

```bash
npx tree-shake-css ./my-large-css-file.css
```

With default options a folder `./css` is generated, where the css classes are written out into `.js` files, and a subfolder `./css/source`, where the according `.svelte` files are stored. You can change the location of the `.js` files with the option `--out`, eg. if you want them to be part of your source files and you can select the folder for the svelte source files with the option `--sourceout`. Recommended example:

```bash
npx tree-shake-css ./my-large-css-file.css --out ./src/css --sourceout ./css-source
```

The folders are separated, so you can easily adjust your `tsconfig.json` file to exclude the svelte source files to improve IDE performance.

### Syntax

Inside your source files you can use the classes then like this:

```javascript
// src/App.svelte
<script>
    import {lg_m_4} from '../css/lg:m-4';
</script>
<main class={lg_m_4}>
    ...
</main>
```

In this example, the original class is called `lg:m-4`. Javascript object are restricted regarding the symbols you can use. Therefore, all used symbols (:,-,/,.) are exchanged by the underscore `_`. Also, if a classname starts with a number, eg. `2xl:pt-0.5`, a trailing underscore is added: `_2xl_pt_0_5`. If a `/` symbol appears in the class name, the filename changes it to `-`, eg:

class: `hover:p-3/4` -> file: `hover:p-3-4` -> js-object: `hover_p_3_4`.

#### Class combine helper

If you need to combine two or more classes, a small helper function is also generated:

```javascript
// src/App.svelte
<script>
    import {c} from '../css/c';
    import {md__m_8} from '../css/md:-m-8';
    import {absolute} from '../css/absolute';
</script>
<button class={c(md__m_8, absolute, "someotherclass")}>...</button>
```

#### Basic css

Each css class is put into a single js file. If your css file contains css code, which cannot be attributed to a class (eg. `body { color: black; }` ) this code is collected and put into another js file. By default the file is called `basic.js`, you can change it with the option `--noclass`. eg. `--noclass preflight`. This can be added at the base of your application (with capitalized first letter):

```javascript
// src/App.svelte
<script>
    import {Basic} from '../css/basic';
</script>
<Basic/>
...
```


