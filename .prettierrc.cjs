module.exports = {
    // makes it easier to digest single argument lambdas
    arrowParens: "avoid",
    // whitespace inside brackets increases readability
    bracketSpacing: true,
    // allows auto format to point out potential bugs with iife or ts cast statements
    semi: true,
    // having trailing comma can decrease the amount of changed lines in git and make diff more readable
    // since adding a comma to allow next argument or key/value pair is a meaningless modification of that line
    trailingComma: "all",
    // allows code to be displayed as is in all envs, some terminal viewers and console logs/printers can have
    // tas width set to 8
    useTabs: false,

    /// rest can be inferred from .editorconfig

    // everything in lf, win<->unix conversion only causes issues
    endOfLine: "lf",
    // modern monitors are bin enough to fit two panes of 120 side by side
    printWidth: 120,
    // makes nested branching abuse more obvious
    tabWidth: 4,
    // makes it easier to move data between js <-> json
    singleQuote: false,
    overrides: [
        // markdown and config files don't benefit from larger indentation
        {
            files: "*.{yml,yaml,md,toml,json,html}",
            options: {
                tabWidth: 2,
            },
        },
    ],
};
