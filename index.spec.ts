import { rehypeMdsvexImageAutoimport } from "./index";
import { compile } from "mdsvex";
import fs from "fs";
import { $t } from "shift-tab";

type Options = Parameters<typeof rehypeMdsvexImageAutoimport>[0];

async function compileSource(input: { source: string; filename: string; options: Options }) {
    const result = await compile(input.source, {
        filename: input.filename,
        extensions: ["mdx"],
        rehypePlugins: [[rehypeMdsvexImageAutoimport, input.options]],
    });

    return result?.code || "";
}

jest.mock("fs");

describe("mdsvex image autoimport", () => {
    beforeEach(() => {
        (fs.existsSync as ReturnType<typeof jest.fn>).mockReturnValue(true);
    });

    it("should import image", async () => {
        const source = $t`
                # Title
                
                ![Image1](./img1.png)
            `;
        const result = await compileSource({
            source,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                <script>;import __img_0 from "./img1.png";</script>
                
                <h1>Title</h1>
                <p><img src="{__img_0}" alt="Image1"></p>
                
            `,
        );
    });

    it("should import multiple images", async () => {
        const result = await compileSource({
            source: $t`
                # Title
                ![Image1](./img1.png)
                
                ![Image2](./img2.png)
            `,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                <script>;import __img_0 from "./img1.png";;import __img_1 from "./img2.png";</script>
                
                <h1>Title</h1>
                <p><img src="{__img_0}" alt="Image1"></p>
                <p><img src="{__img_1}" alt="Image2"></p>
                
            `,
        );
    });

    it("should skip http images", async () => {
        const result = await compileSource({
            source: $t`
                # Title
                ![Image1](http://somedomain.com/someimage.jpg)
                
                ![Image2](./img1.png)
            `,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                <script>;import __img_0 from "./img1.png";</script>
                
                <h1>Title</h1>
                <p><img src="http://somedomain.com/someimage.jpg" alt="Image1"></p>
                <p><img src="{__img_0}" alt="Image2"></p>
                
            `,
        );
    });

    it("should skip images that don't exist", async () => {
        (fs.existsSync as ReturnType<typeof jest.fn>).mockReturnValue(false);

        const result = await compileSource({
            source: $t`
                # Title
                ![Image2](./img1.png)
            `,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                
                <h1>Title</h1>
                <p><img src="./img1.png" alt="Image2"></p>
                
            `,
        );
    });

    it("should allow to define id generator", async () => {
        const result = await compileSource({
            source: `![Image1](./img1.png)`,
            filename: "test/index.mdx",
            options: { id: i => "__id" + i },
        });

        expect(result).toBe(
            $t`
                <script>;import __id0 from "./img1.png";</script>
                
                <p><img src="{__id0}" alt="Image1"></p>
                
            `,
        );
    });

    it("should allow to define path resolve", async () => {
        const result = await compileSource({
            source: `![Image1](./img1.png)`,
            filename: "test/index.mdx",
            options: { resolve: (imagePath, parentPath) => `./images/img1.png` },
        });

        expect(result).toBe(
            $t`
                <script>;import __img_0 from "./images/img1.png";</script>
                
                <p><img src="{__img_0}" alt="Image1"></p>
                
            `,
        );
    });

    it("should only call resolve on local images", async () => {
        const spy = jest.fn((imagePath, parentPath) => `./images/img1.png`);
        const result = await compileSource({
            source: $t`
                # Title
                ![Image1](http://somedomain.com/someimage.jpg)
                
                ![Image2](./img1.png)
            `,
            filename: "test/index.mdx",
            options: { resolve: spy },
        });

        expect(spy).toBeCalledTimes(1);
    });

    it("should inject into existing script", async () => {
        const result = await compileSource({
            source: $t`
                <script>import a from "b";</script>
                
                ![Image1](./img1.png)
            `,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                <script>import a from "b";;import __img_0 from "./img1.png";</script>
                
                
                <p><img src="{__img_0}" alt="Image1"></p>
                
            `,
        );
    });

    it("should not inject into module script", async () => {
        const result = await compileSource({
            source: $t`
                <script context="module">export let flag = 1;</script>
                
                ![Image1](./img1.png)
            `,
            filename: "test/index.mdx",
            options: {},
        });

        expect(result).toBe(
            $t`
                <script>;import __img_0 from "./img1.png";</script>
                <script context="module">export let flag = 1;</script>
                
                
                <p><img src="{__img_0}" alt="Image1"></p>
                
            `,
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
                $t`
                    <script>;import __img_0 from "./img1.png?srcset";</script>
                    
                    <p><img src="{__img_0}" alt="Image1"></p>
                    
                `,
            );
        });

        it("should preserve search params even with custom resolver", async () => {
            const result = await compileSource({
                source: `![Image1](./img1.png?srcset)`,
                filename: "test/index.mdx",
                options: { resolve: (imagePath, parentPath) => `./images/img1.png?srcset` },
            });

            expect(result).toBe(
                $t`
                    <script>;import __img_0 from "./images/img1.png?srcset";</script>
                    
                    <p><img src="{__img_0}" alt="Image1"></p>
                    
                `,
            );
        });
    });
});
