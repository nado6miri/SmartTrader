var express = require('express');
var router = express.Router();

var fs = require('fs');
var fse = require('fs-extra');

var http = require('http');
var url = require('url');
var XMLHttpRequest = require('xmlhttprequest-ssl').XMLHttpRequest;


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
  });
  

module.exports = router;
