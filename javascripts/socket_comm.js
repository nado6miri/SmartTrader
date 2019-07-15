var http = require('http');
var socket_server = 0;
var socket_trader = 0;

// http://bcho.tistory.com/899 
function socket_server_communication(port)
{
    if(socket_server == 0)
    {
        console.log("############ socket_server - Initialize socket communication ########################");
        socket_server = http.createServer((req, res) => { }).listen(port);
        // upgrade http server to socket.io server
        var socketcommm = require('socket.io').listen(socket_server);

        socketcommm.sockets.on('connection', function (socket){
            socket.on('clientcmd', function (data) {
                var cmd = data.msg;
                console.log('############## toclient :' + data.msg);
                if ("fromclient" == cmd) 
                {
                    socket.emit('toclient', { msg: '[fromclient] New Contribution... Insert row First !!' });
                    console.log('toclient :' + data.msg);
                }
                else if("status" == cmd)
                {
                    socket.emit('status_monitoring', { msg: "get server status... alive..." });
                    console.log('############## toclient :' + data.msg);
                }
                /*
                else if ("initiative_lists" == cmd) 
                {
                    socket.emit('toclient', { msg: '[initiative_lists] New Contribution... Insert row Last !!' });
                    console.log('toclient :' + data.msg);

                    // Use Promise Object
                    initApi.get_InitiativeListfromJira("filterID", 46093, false).then(function (data)
                    {
                        console.log("Initiative List gathering ok - Promise");
                        console.log(data);
                        socket.emit('initiative_lists', data);
                    }).catch(function (err)
                    {
                        console.log("Initiative List gathering NG - Promise");
                        console.log(err);
                        res.send('Initiative List gathering NG - Promise');
                    });
                }
                */
                else 
                {
                }
                console.log('################Message from client :' + data.msg);
            });
        });
    }
    else
    {
        console.log("Already opened socket communication - Skip Initializing socket communication");
    }
}


// http://bcho.tistory.com/899 
function socket_trader_communication(port)
{
    if(socket_trader == 0)
    {
        console.log("############ socket_trader - Initialize socket communication ########################");
        socket_trader = http.createServer((req, res) => { }).listen(port);
        // upgrade http server to socket.io server
        var socketcommm = require('socket.io').listen(socket_trader);

        socketcommm.sockets.on('connection', function (socket){
            socket.on('clientcmd', function (data) {
                var cmd = data.msg;
                console.log('############## toclient :' + data.msg);
                if ("fromclient" == cmd) 
                {
                    socket.emit('toclient', { msg: '[fromclient] New Contribution... Insert row First !!' });
                    console.log('toclient :' + data.msg);
                }
                else if("status" == cmd)
                {
                    socket.emit('alive_monitoring', { msg: "get trader status... alive..." });
                    console.log('############## toclient :' + data.msg);
                }
                else 
                {
                }
                console.log('################Message from client :' + data.msg);
            });
        });
    }
    else
    {
        console.log("Already opened socket communication - Skip Initializing socket communication");
    }
}


module.exports = { socket_server_communication, socket_trader_communication };
