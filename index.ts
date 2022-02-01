import path from "path";
import fs from "fs";
import { visit } from "unist-util-visit";
import type { Literal, Node, Parent } from "unist";

type Script = Literal<string>;

const isScript = (node: any): node is Script => {
    return (
        node &&
        typeof node === "object" &&
        node.type === "raw" &&
        typeof node.value === "string" &&
        node.value.startsWith("<script") &&
        node.value.endsWith("</script>")
    );
};

const isNonModuleScript = (node: any): node is Script => {
    return isScript(node) && !node.value.includes(`context="module"`);
};

const isModuleScript = (node: any): node is Script => {
    return isScript(node) && node.value.includes(`context="module"`);
};

const isImgTag = (node: any): node is Script => {
    return (
        node &&
        typeof node === "object" &&
        node.type === "element" &&
        typeof node.properties === "object" &&
        typeof node.properties.src === "string" &&
        node.properties.src !== ""
    );
};

type Options = {
    /** Override generated ids for each import */
    id?: (index: number) => string;

    /** Supply your own resolver that returns
     * string: resolved path to use for import
     * false: skip this image
     * void|undefined: use default resolver
     */
    resolve?: (imageSrc: string, documentPath: string) => string | false | void;
};

type Resolver = Required<Options>["resolve"];

const getId = (index: number) => `__img_${index}`;

const defaultResolve = (imgSrc: string, parentPath: string): string | undefined => {
    const [imagePath, searchParams = ""] = parseImagePath(imgSrc);
    const dirname = path.dirname(parentPath);
    const imageFullPath = path.resolve(dirname, imagePath);
    if (!fs.existsSync(imageFullPath)) {
        return;
    }
    const relPath = path.relative(dirname, imageFullPath);
    const relPrefix = relPath.startsWith("..") ? "" : "./";
    const importPath = `${relPrefix}${relPath}${searchParams}`;
    return importPath;
};

const parseImagePath = (imgPath: string) => {
    const index = imgPath.indexOf("?");
    return index >= 0 ? [imgPath.substring(0, index), imgPath.substring(index)] : [imgPath];
};

function resolvePath(imgSrc: string, parentPath: string, resolvers: (Resolver | undefined)[]): string | undefined {
    for (const resolver of resolvers) {
        if (resolver) {
            const resolveResult = resolver(imgSrc, parentPath);
            if (typeof resolveResult === "string") {
                return resolveResult;
            } else if (resolveResult === false) {
                return undefined;
            }
        }
    }
}

export function rehypeMdsvexImageAutoimport(config?: Options) {
    const makeId = typeof config?.id === "function" ? config?.id : getId;

    return (tree: Node, file: any & { filename: string }) => {
        let script: Script | undefined = undefined;
        let moduleScript: Script | undefined = undefined;

        if (!file.filename) {
            console.warn("[rehype-mdsvex-image-autoimport] Unexpected: file has no filename");
            return;
        }

        visit(tree, isNonModuleScript, (node, index, parent) => {
            script = node;
        });

        visit(tree, isModuleScript, (node, index, parent) => {
            moduleScript = node;
        });

        const getScriptNode = () => {
            if (!script) {
                script = {
                    type: "raw",
                    value: `<script></script>`,
                };
                const t = tree as Parent;
                if (!t.children) {
                    t.children = [];
                }
                t.children.unshift(script, {
                    type: "raw",
                    value: "\n",
                } as Node);
            }
            return script;
        };

        const addImportToScriptNode = (id: string, path: string) => {
            const node = getScriptNode();
            node.value = node.value.replace("</script>", `;import ${id} from "${path}";</script>`);
        };

        const findImageNodes = () => {
            const nodes: Node[] = [];
            visit(tree, isImgTag, (node: any, index, parent) => {
                const src = node.properties.src;
                if (src.startsWith("http://") || src.startsWith("https://")) {
                    return;
                }
                nodes.push(node);
            });
            return nodes;
        };

        const images = findImageNodes();
        images.forEach((imgNode: any, index) => {
            const src: string = imgNode.properties.src;
            let filePath: string;

            if (/{\w+}/.test(src) && moduleScript) {
                const id = src.slice(1, -1);
                const match = moduleScript.value.match(RegExp(`"${id}":"(.*?)"`));
                filePath = match?.[1] || src;
            } else {
                filePath = src;
            }

            let importPath = resolvePath(filePath, file.filename, [config?.resolve, defaultResolve]);
            if (importPath) {
                const id = makeId(index);
                addImportToScriptNode(id, importPath);
                imgNode.properties.src = `{${id}}`;
            }
        });
    };
}
