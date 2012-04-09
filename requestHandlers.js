var fs = require('fs'),
    temp = require('temp'),
    formidable = require('formidable'),
    util = require('util'),
    async = require('async'),
    redis = require('redis');

function start(response) {
    console.log("Request handler 'start' was called.");

    var body = '<html>' +
        '<head>' +
        '<meta http-equiv="Content-Type" ' +
        'content="text/html; charset=UTF-8" />' +
        '</head>' +
        '<body>' +
        '<form action="/upload" enctype="multipart/form-data" ' +
        'method="post">' +
        '<input type="file" name="upload" multiple="multiple">' +
        '<input type="submit" value="Upload file" />' +
        '</form>' +
        '</body>' +
        '</html>';

    response.writeHead(200, {"Content-Type":"text/html"});
    response.write(body);
    response.end();
}

function processFile(relativeUrl, file) {
    console.log("Function 'processFile' was called for file " + file.name + " uploaded from url " + relativeUrl + " which was saved as " + file.path);

    var redisClient = redis.createClient(); // defaults

    temp.mkdir('splitter', function (err, dirPath) {
        // We could use Libxmljs to do the XML thing or node-bufferstream to split up an input stream
        // but here we just split on new lines, using the fs streams

        var lazy = require("lazy");

        new lazy(fs.createReadStream(file.path))
            .lines
            .forEach(function (line) {
                console.log("Found: " + line);
                // Push it into REDIS (RPUSH is enqueue, LPOP is dequeue)
                redisClient.rpush(file.name, line);
                console.log("Pushed: " + line + " on to REDIS");
            }
        );

    });

    console.log("Trying to operate on each line: ");


    // async code to format the data in N worker threads
    var numThreads = 10;
    var threadPool = require('threads_a_gogo').createPool(numThreads);

    var fetchedLine = redisClient.lpop(file.name);
    console.log("Fetched line: " + fetchedLine);

    function formatData(line) {
        return "Formatted " + line;
    }

    threadPool.any.eval('formatData(' + fetchedLine + ')', function (err, data) {
        if (err !== null) {
            console.log('Threading barfage follows: ' + err);
        } else {
            console.log(" [" + this.id + "]" + data);
        }
    });

    console.log("Function 'processFile' is done.");
}

function upload(response, request) {
    console.log("Request handler 'upload' was called.");

    var form = new formidable.IncomingForm();

    form.on('file', processFile);

    form.parse(request, function (error, fields, files) {
        response.writeHead(200, {"Content-Type":"text/html"});
        response.end(util.inspect({fields:fields, files:files}));
    });

    // here we hook in socket.io and then start feeding out redis events that are created as the files are processed

    console.log("Request handler 'upload' is done.");
}


exports.start = start;
exports.upload = upload;
