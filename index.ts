import path from "path";
import fs from "fs";
import { visit } from "unist-util-visit";
import type { Literal, Node, Parent } from "unist";
import type { VFile } from "vfile";

type Script = Literal<string>;

const isNonModuleScript = (node: any): node is Script => {
    return (
        node &&
        typeof node === "object" &&
        node.type === "raw" &&
        typeof node.value === "string" &&
        node.value.startsWith("<script") &&
        node.value.endsWith("</script>") &&
        !node.value.includes(`context="module"`)
    );
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
    checkExistance?: boolean;
    id?: (index: number) => string;
    resolve?: (imagePath: string, parentPath: string) => string | void;
};

const getId = (index: number) => `__img_${index}`;

const resolvePth = (imagePath: string, parentPath: string) => path.resolve(path.dirname(parentPath), imagePath);

const parseImagePath = (imgPath: string) => {
    const index = imgPath.indexOf("?");
    return index >= 0 ? [imgPath.substring(0, index), imgPath.substring(index)] : [imgPath];
};

export function rehypeMdsvexImageAutoimport(config?: Options) {
    const makeId = typeof config?.id === "function" ? config?.id : getId;
    const resolve = typeof config?.resolve === "function" ? config?.resolve : resolvePth;

    return (tree: Node, file: any & { filename: string }) => {
        let script: Script | undefined = undefined;

        if (!file.filename) {
            console.warn("[rehypeMdsvexImageAutoimport] Unexpected: file has no filename");
            return;
        }

        visit(tree, isNonModuleScript, (node, index, parent) => {
            script = node;
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
                t.children.unshift(script);
            }
            return script;
        };

        const addImportToScriptNode = (id: string, path: string) => {
            const node = getScriptNode();
            node.value = node.value.replace("</script>", `;import ${id} from "${path}";</script>`);
        };

        const findImageNodes = () => {
            const nodes: Node[] = [];
            visit(tree, isImgTag, (node, index, parent) => {
                nodes.push(node);
            });
            return nodes;
        };

        const images = findImageNodes();

        images.forEach((imgNode: any, index) => {
            const [imagePath, searchParams = ""] = parseImagePath(imgNode.properties.src);
            const fullImagePath = resolve(imagePath, file.filename);

            if (fullImagePath) {
                if (config?.checkExistance && !fs.existsSync(fullImagePath)) {
                    return;
                }

                const id = makeId(index);
                const relPath = path.relative(path.dirname(file.filename), fullImagePath);
                const relPrefix = relPath.startsWith("..") ? "" : "./";
                const importPath = `${relPrefix}${relPath}${searchParams}`;
                addImportToScriptNode(id, importPath);
                imgNode.properties.src = `{${id}}`;
            }
        });
    };
}
