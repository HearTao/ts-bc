module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testPathIgnorePatterns: [
      "libs/",
      "gen.browser.test.ts"
    ]
}
