import { rehypeMdsvexImageAutoimport } from "./index";
import { compile } from "mdsvex";

type Options = Parameters<typeof rehypeMdsvexImageAutoimport>[0];

async function compileSource(input: { source: string; filename: string; options: Options }) {
    const result = await compile(input.source, {
        filename: input.filename,
        extensions: ["mdx"],
        rehypePlugins: [[rehypeMdsvexImageAutoimport, input.options]],
    });

    return result?.code || "";
}

const text = (lines: string[]) => lines.join("\n");

describe("mdsvex image autoimport", () => {
    it("should import image as id and replace image path with that id", async () => {
        const result = await compileSource({
            source: text([
                `# Title`, //
                `![Image1](./img1.png)`,
            ]),
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            text([
                '<script>;import __img_0 from "./img1.png";</script>',
                "<h1>Title</h1>",
                '<p><img src="{__img_0}" alt="Image1"></p>',
                "",
            ]),
        );
    });

    it("should allow to define id generator", async () => {
        const result = await compileSource({
            source: `![Image1](./img1.png)`,
            filename: "test/index.mdx",
            options: { id: i => "__id" + i },
        });

        expect(result).toBe(
            text(['<script>;import __id0 from "./img1.png";</script>', '<p><img src="{__id0}" alt="Image1"></p>', ""]),
        );
    });

    it("should allow to define path resolve", async () => {
        const result = await compileSource({
            source: `![Image1](./img1.png)`,
            filename: "test/index.mdx",
            options: { resolve: (imagePath, parentPath) => `test/images/img1.png` },
        });

        expect(result).toBe(
            text([
                '<script>;import __img_0 from "./images/img1.png";</script>',
                '<p><img src="{__img_0}" alt="Image1"></p>',
                "",
            ]),
        );
    });

    it("should inject into existing script", async () => {
        const result = await compileSource({
            source: text([
                `<script>import a from "b";</script>`, //
                `![Image1](./img1.png)`,
            ]),
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            text([
                '<script>import a from "b";;import __img_0 from "./img1.png";</script>',
                "",
                "",
                '<p><img src="{__img_0}" alt="Image1"></p>',
                "",
            ]),
        );
    });

    it("should not inject into module script", async () => {
        const result = await compileSource({
            source: text([
                `<script context="module">export let flag = 1;</script>`, //
                `![Image1](./img1.png)`,
            ]),
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            text([
                '<script>;import __img_0 from "./img1.png";</script>' +
                    '<script context="module">export let flag = 1;</script>',
                "",
                "",
                '<p><img src="{__img_0}" alt="Image1"></p>',
                "",
            ]),
        );
    });

    describe("search params", () => {
        it("should preserve search params in import queries for vite", async () => {
            const result = await compileSource({
                source: `![Image1](./img1.png?srcset)`,
                filename: "test/index.mdx",
                options: {},
            });

            expect(result).toBe(
                text([
                    '<script>;import __img_0 from "./img1.png?srcset";</script>',
                    '<p><img src="{__img_0}" alt="Image1"></p>',
                    "",
                ]),
            );
        });

        it("should preserve search params even with custom resolver", async () => {
            const result = await compileSource({
                source: `![Image1](./img1.png?srcset)`,
                filename: "test/index.mdx",
                options: { resolve: (imagePath, parentPath) => `test/images/img1.png` },
            });

            expect(result).toBe(
                text([
                    '<script>;import __img_0 from "./images/img1.png?srcset";</script>',
                    '<p><img src="{__img_0}" alt="Image1"></p>',
                    "",
                ]),
            );
        });
    });
});
