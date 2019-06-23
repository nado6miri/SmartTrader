var express = require('express');
var router = express.Router();

var fs = require('fs');
var fse = require('fs-extra');
var mongoose = require('mongoose');
var moment = require('moment-timezone')

var http = require('http');
var url = require('url');
var XMLHttpRequest = require('xmlhttprequest-ssl').XMLHttpRequest;

moment.tz.setDefault("Asiz/Seoul");
var ConfigParam_DB = require('../models/configuration');

/*
// http://mongodb.github.io/node-mongodb-native/api-generated/
// https://bcho.tistory.com/1094

var MongoClient = require('mongodb').MongoClient
var Server = require('mongodb').Server;
var mongoclient = new MongoClient(new Server('localhost',27017,{'native_parser':true}));
var db = mongoclient.db('configparamDB');
mongoclient.open(function(err, mongoclient) 
{
    if(err) throw err;
    console.log('mongo client connected');
    http.createServer(app).listen(app.get('port'), function(){
        console.log('Express server listening on port ' + app.get('port'));
    });
});
*/

var DB_Connected = false;

const databaseUrl = 'mongodb://sdet:sdet@127.0.0.1:27017/admin';
const accessDB = "configparamDB";
mongo_connectDB(databaseUrl, accessDB);


function mongo_connectDB(db_url, accessDBName)
{
    if(DB_Connected == false)
    {
        console.log("DB 연결을 시도합니다.");
        mongoose.Promise = global.Promise; // mongoose의 Promise 객체는 global의 Promise 객체를 사용하도록 함.
        mongoose.connect(db_url, { dbName: accessDBName, useNewUrlParser : true });
        
        let database = mongoose.connection;
        database.on('error', console.error.bind(console, 'mongoose connection error'));
        database.on('open', () => {
            console.log("connect to database successfully"); 
            DB_Connected = true;
        });
        database.on('disconnected', () => {
            console.log("disconnected to database...");
            DB_Connected = false;
        });
    }
    else
    {
        console.log("DB is already opened & connected");
    }
}



/* GET default page */
router.get('/', function(req, res, next) {
    res.writeHead(200, { 'Content-Type': 'text/html' }); // header 설정
    //fs.readFile(__dirname + '/../views/default.html', (err, data) => { // 파일 읽는 메소드
    fs.readFile(__dirname + '/../views/setting_config.html', (err, data) => { // 파일 읽는 메소드
        if (err) {
            return console.error(err); // 에러 발생시 에러 기록하고 종료
        }
        res.end(data, 'utf-8'); // 브라우저로 전송   
    });
    /*
    // db 조회 : https://bcho.tistory.com/889
    db.collection('configurations').findOne({},function(err,doc){
        if(err) throw err;
        res.send(doc);
        });
    });
    */
});


/* GET default page */
router.get('/configparam', function(req, res, next) {
    console.log("[get] body = ", JSON.stringify(req.body));
    console.log("[get] params(path) = ", JSON.stringify(req.params));
    console.log("[get] query = ", JSON.stringify(req.query));

    res.writeHead(200, { 'Content-Type': 'text/html' }); // header 설정
    let filename = req.query['configfile'];
    fs.readFile(__dirname + '/../output/' + filename, (err, data) => { // 파일 읽는 메소드
        if (err) {
            res.end(JSON.stringify(err), 'utf-8');
            return console.error(err); // 에러 발생시 에러 기록하고 종료
        }
        res.end(data, 'utf-8'); // 브라우저로 전송   
    });
});


/* GET default page */
router.get('/portfoliolists', function(req, res, next) {
    console.log("[get] body = ", JSON.stringify(req.body));
    console.log("[get] params(path) = ", JSON.stringify(req.params));
    console.log("[get] query = ", JSON.stringify(req.query));

    res.writeHead(200, { 'Content-Type': 'text/html' }); // header 설정
    let filename = req.query['filename'];
    fs.readFile(__dirname + '/../parameters/' + filename, (err, data) => { // 파일 읽는 메소드
        if (err) {
            res.end(JSON.stringify(err), 'utf-8');
            return console.error(err); // 에러 발생시 에러 기록하고 종료
        }
        res.end(data, 'utf-8'); // 브라우저로 전송   
    });
});


/*
  DB 검색
*/
router.get('/list', function(req, res, next) {
    console.log("[get] body = ", JSON.stringify(req.body));
    console.log("[get] params(path) = ", JSON.stringify(req.params));
    console.log("[get] query = ", JSON.stringify(req.query));

    ConfigParam_DB.findAll().then((result) => { console.log("result = ", result); }).catch((error)=> { console.log("error = ", error); });
    res.end("DB List가 검색 완료되었습니다.", 'utf-8'); // 브라우저로 전송   
});


 
/* POST param parsing test */
// http://10.186.115.57:3000/login?param1=param1test&param2=param2test 
// req.params : /login:id
// req.query : url상의 ?a=b&c=d { a = b, b = c }
// req.body : form상의 key / value 쌍. { userid : "sungbin", password : "aaaaaaaa" }
router.post('/updatecfg', function(req, res, next) {
    console.log("[POST] body = ", JSON.stringify(req.body));
    console.log("[POST] params(path) = ", JSON.stringify(req.params));
    console.log("[POST] query = ", JSON.stringify(req.query));

    let filename = req.body['name'];
    let config = JSON.stringify(req.body['cfg']);
    console.log("filename = ", filename, "config = ", config); 

    fs.writeFile(__dirname + "/../output/" + filename, config, function (err) {
        if (err) throw err;
        console.log('Saved!');
      });
    /*
    let today = new Date();
    let newdata = { };
    let recievedData = req.body;
    for(market in recievedData)
    {
        if(newdata.hasOwnProperty(market) === false) { newdata[market] = {}; }
        
        for(marketID in recievedData[market])
        {
            if(newdata[market].hasOwnProperty(marketID) === false) { newdata[market][marketID] = { }; }
            newdata[market][marketID]['marketID'] = market + "_" + marketID;
            newdata[market][marketID]['inserted'] = today;
            newdata[market][marketID]['config'] = recievedData[market][marketID]['config'];
        }
    }
    
    console.log("newdata = ", newdata, JSON.stringify(newdata));
    */
    res.end("Update 완료되었습니다.", 'utf-8'); // 브라우저로 전송   
});




  
/* POST param parsing test */
// http://10.186.115.57:3000/login?param1=param1test&param2=param2test 
// req.params : /login:id
// req.query : url상의 ?a=b&c=d { a = b, b = c }
// req.body : form상의 key / value 쌍. { userid : "sungbin", password : "aaaaaaaa" }
router.post('/post', function(req, res, next) {
    console.log("[POST] body = ", JSON.stringify(req.body));
    console.log("[POST] params(path) = ", JSON.stringify(req.params));
    console.log("[POST] query = ", JSON.stringify(req.query));

    let today = new Date();
    let newdata = { };
    let recievedData = req.body;
    
    for(market in recievedData)
    {
        if(newdata.hasOwnProperty(market) === false) { newdata[market] = {}; }
        
        for(marketID in recievedData[market])
        {
            if(newdata[market].hasOwnProperty(marketID) === false) { newdata[market][marketID] = { }; }
            newdata[market][marketID]['marketID'] = market + "_" + marketID;
            newdata[market][marketID]['inserted'] = today;
            newdata[market][marketID]['config'] = recievedData[market][marketID]['config'];
        }
    }
    
    console.log("newdata = ", newdata, JSON.stringify(newdata));

    //ConfigParam_DB.insert(newdata).then((result) => { console.log("result = ", result); }).catch((error)=> { console.log("error = ", error); });
    //mongoose.disconnect();
    res.end("신규 생성 완료되었습니다.", 'utf-8'); // 브라우저로 전송   
});


router.put('/update', function(req, res, next) {
    console.log("[UPDATE] body = ", JSON.stringify(req.body));
    console.log("[UPDATE] params(path) = ", JSON.stringify(req.params));
    console.log("[UPDATE] query = ", JSON.stringify(req.query));
    
    let today = new Date();
    let dbdata = { };
    let newdata = { };
    let recievedData = req.body;
    
    for(market in recievedData)
    {
        if(newdata.hasOwnProperty(market) === false) { newdata[market] = {}; }
        
        for(marketID in recievedData[market])
        {
            if(newdata[market].hasOwnProperty(marketID) === false) { newdata[market][marketID] = { }; }
            newdata[market][marketID]['marketID'] = market + "_" + marketID;
            newdata[market][marketID]['inserted'] = today;
            newdata[market][marketID]['config'] = recievedData[market][marketID]['config'];
        }
    }
    
    console.log("newdata = ", newdata, JSON.stringify(newdata));

    let key = Object.keys(newdata)[0];
    let ID = Object.keys(newdata[key])[0];
    let querystring = key + "." + ID + "." + "marketID";
    let value = key + "_" + ID;
    console.log("key = ", key, " ID = ", ID, "querystring = ", querystring, "value = ", value); 

    dbdata['purpose'] = "configuration";

    let query = { };
    query[querystring] = value;  //let query = { "menu0.ID5.marketID": "menu0_ID5" };
    let configquery = { purpose : "configuration" }
    ConfigParam_DB.query(configquery).then((result) => { 
        console.log("update ok = ", result[0])
        dbdata = result[0];
        dbdata[key][ID] = newdata[key][ID];
        ConfigParam_DB.replace(configquery, dbdata).then((result) => { console.log("update ok = ", result)}).catch((error) => { console.log("Update fail = ", error); }); 
    })
    .catch((error) => { console.log("Update fail = ", error); }); 
    
    res.end("갱신이 완료되었습니다.", 'utf-8'); // 브라우저로 전송   
});


module.exports = router;




/*
const SchemaDefine = { 
    market1 :  
    {
        ID1 : {
            marketID : market1_ID1,
            inserted_at : Date, 
            config : Object 
            }
        ID2 : {
            marketID : market1_ID2,
            inserted_at : Date, 
            config : Object 
            }
    }
    market2 :  
    {
        ID1 : {
            marketID : market2_ID1,
            inserted_at : Date, 
            config : Object 
            }
        ID2 : {
            marketID : market2_ID2,
            inserted_at : Date, 
            config : Object 
            }
    }
}
*/