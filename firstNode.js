function start(route, handle) {

    var portNumber = 8090;

    function onRequest(request, response) {

        var pathname = require('url').parse(request.url).pathname;

        console.log('Request for ' + pathname + ' received.');

        route(handle, pathname, response, request);
    }

    require('http').createServer(onRequest).listen(portNumber);

    console.log('Server has started on port ' + portNumber);
}

exports.start = start;