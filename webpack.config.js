
const path = require('path');
const webpack = require('webpack');

module.exports = {
    context: __dirname + '/source',

    cache: true,
    devtool: 'source-map',
    entry: {
        'sky-triangle': ['require.ts', 'sky-triangle/example.ts'],
        'test-renderer': ['require.ts', 'test-renderer/example.ts']
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].js',
        library: 'glexamples',
        libraryTarget: 'umd'

    },
    resolve: {
        modules: [__dirname + '/node_modules', __dirname + '/source'],
        extensions: ['.ts', '.tsx']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                }
            },
            {
                test: /\.(glsl|vert|frag)$/,
                use: { loader: 'webpack-glsl-loader' },
            }]
    },
};
