module.exports = {
    root: true,

    env: {
        browser: true,
    },

    extends: [
        'airbnb'
    ],

    rules: {
        'import/no-unresolved': [2, { ignore: ['$'] }],
        'indent': ['error', 4],
        'react/no-this-in-sfc': [0],
    },
}
