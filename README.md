# rehype-mdsvex-image-autoimport

Rehype plugin for MDSveX to automatically turn your markdown images to local imports.

By default, it imports only images that are not web links (starts with `http(s)`) and if the file exist locally relatively to the document. But you can override resolving logic.

This package is an ES Module.

Usage:

```ts
import { compile } from "mdsvex";
import { rehypeMdsvexImageAutoimport } from "rehype-mdsvex-image-autoimport";

const source = `
# Title
![Image1](./img1.png)
`;

const vanilla = await compile(input.source);
// <h1>Title</h1>
// <p><img src="./img1.png" alt="Image1"></p>

const autoImported = await compile(input.source, {
  rehypePlugins: [rehypeMdsvexImageAutoimport],
});
// <script>;import __img_0 from "./img1.png";</script>
// <h1>Title</h1>
// <p><img src="{__img_0}" alt="Image1"></p>

const configured = await compile(input.source, {
  rehypePlugins: [
    [
      rehypeMdsvexImageAutoimport,
      {
        id: i => "customId" + i,
        resolve: (imageSrc, documentPath) => {
          const dir = path.dirname(documentPath);
          const file = path.basename(imageSrc);
          return `${dir}/images/${file}`;
        },
      },
    ],
  ],
});
// <script>;import customId0 from "./images/img1.png";</script>
// <h1>Title</h1>
// <p><img src="{customId0}" alt="Image1"></p>

// supports import search params for vite plugins like vite-imagetools
const preservedImportSearch = await compile(`
# Title
![Image1](./img1.png?srcset)
`);
// <script>;import __img_0 from "./img1.png?srcset";</script>
// <h1>Title</h1>
// <p><img src="{__img_0}" alt="Image1"></p>
```

Options signature:

```ts
type Options = {
  /** Override generated ids for each import */
  id?: (index: number) => string;

  /** Supply your own resolver
   * string: resolved path to use for import
   * false: skip this image
   * void|undefined: use default resolver
   */
  resolve?: (imageSrc: string, documentPath: string) => string | false | void;
};
```
