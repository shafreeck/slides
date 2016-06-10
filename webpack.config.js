module.exports = {
    entry: {
        'bundle.js':'./src/app.js'
    },
    output: {
        path: './dist',
        filename: '[name]'
    },
    module: {
        loaders: [
        { test: /\.css$/, loader: "style-loader!css-loader" },
        { test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/, loader : 'file-loader?name=fonts/[name]-[hash].[ext]'},
        { test: /\.(html|json)$/, loader : 'file-loader?name=[name].[ext]'},
        { test: /\.md$/, loader : 'file-loader?name=slides/[name].[ext]'}
        ]
    }
};

