# Slides

Slides is a Slide Sync solution based on remarkjs and mqtt

* [Remarkjs](http://remarkjs.com/) renders markdown to slide presentations
* [MQTT](http://mqtt.org/) A pub/sub message protocol, slides use the public test.mosquitto.org now
* You can make slides use your private mqtt brokers

![screencast](./slides-screencast.gif)

#### Demo
* See the [demo](http://shafreeck.github.io/slides) here

#### Editing
* Use [slides-preview](http://github.com/shafreeck/slides-preview) in atom to make it easy to edit and preview your markdown

## Building

```
npm install
npm run build 
```

The generated files will locate at dist/, Publish it to your web servers.

## Play your markdown 
It is simple to show your markdown as slide presentations
1. Copy the markdown file to dist/slides
2. Edit dist/slides.json, Add the path of your markdown file

## Development

```
npm run dev
```

Start a local web server which based on webpack-dev-server
