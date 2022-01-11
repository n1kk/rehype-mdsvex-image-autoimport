/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transformIgnorePatterns: ["/node_modules/(?!(unist-util-visit))/"],
    transform: {
        "^.+\\.(js|mjs)$": ["ts-jest"],
        "\\.ts$": ["ts-jest"],
    },
};
