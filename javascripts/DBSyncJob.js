/*
[Mongodb 설치 및 server run]
https://velopert.com/tag/mongodb

1. server설치 : mongod => sudo apt install mongodb-server-core
2. client설치 : mongo  => sudo apt install mongodb-clients
3. server실행 : mongod --dbpath /home/sdet/sdetshare/mongo_database/ &
                mongod --dbpath /home/sdet/sdetshare/mongo_database/ & --auth 
                mongod --dbpath /home/sdet/sdetshare/mongo_database/ --auth --port 30301 --bind_ip *.*.*.* &
                sudo service mongodb start  
                sudo service mongodb stop
4. 동작확인 : netstat -ntlp | grep mongod
5. server Port 변경 : default 27017
 - mongod.conf file 설정하여 auth = true로 변경함. port / ip까지 변경 가능..
 - 서버 접근 : mongodb://id:pwd@localhost:27017/test

[기본개념]
MYSQL (Database)  == mongodb (Database)
MYSQL (Table)  == mongodb (Collection)
MYSQL (Row)  == mongodb (Document)
MYSQL (Column)  == mongodb (key/field)
MYSQL (Primary Key)  == mongodb (Primary Key(_id))
MYSQL (Table Join)  == mongodb (Embedded Document)


[mongo client]
client실행 : /mongo + enter
--auth 옵션 실행 시 : mongo -u sdet -p sdet --authenticationDatabase admin
1. mongodb user 생성 (DB별로 생성할 수도 있고 admin DB를 통해 DB 권한을 사용자별로 관리 가능함.)
https://bestistsite.wordpress.com/2016/05/21/%EB%AA%BD%EA%B3%A0db-%EC%82%AC%EC%9A%A9%EC%9E%90-%EA%B3%84%EC%A0%95-%EA%B4%80%EB%A6%AC/
  > use admin
  > db.createUser({user: "", pwd: "", roles: ["root"]})
  > db.createUser({user: "", pwd: "", roles: ["dbAdmin", "readWrite"]})
  > db.createUser({user: "initiativemgr", pwd: "initiativemgr", roles: [ {role: "readWrite", db: "initiativemgr"} ]})
  > db.createUser( {user: "testUser", userSource: "test", roles: ["read"], otherDBRoles:{ testDB2: ["readWrite"] } } ) // 현재 db에 대해 read권한을 주고, 다른 db에 rw권한을 준다.
  > mongo <host:port>/DATABASE -u "ROOT_ID" -p "ROOT_PASSWO" --authenticationDatabase "admin"
 - user 확인
  > db를 선택 후 show users 
 - user 삭제
  >  db.dropUser("삭제할 사용자 계정 이름")

출처: https://hwanschoi.tistory.com/120 [신세계에 발을 담그다]
2. Database 생성 : use DB_Name
3. Database 제거 : use DB_Name --> db.dropDatabase(); 
4. DB list 확안 : show dbs 
5. Document insert 
 - db.book.insert({"name" : "Initative Manager"}) // book 은 Collection Name임. book 이라는 Collection에 json 형태의 document를 추가 한 case임.
 - db.book.insert([ {"name": "Book1", "author": "Velopert"}, {"name": "Book2", "author": "Velopert"} ]); // book이라는 collection에 document 2개를 추가한 case.
6. Document 제거
 - prototype : db.book.remove(criteria, justOne)
   criteria	document	삭제 할 데이터의 기준 값 (criteria) 입니다. 이 값이 { } 이면 컬렉션의 모든 데이터를 제거합니다.
   justOne	boolean	선택적(Optional) 매개변수이며 이 값이 true 면 1개 의 다큐먼트만 제거합니다. 이 매개변수가 생략되면 기본값은 false로서, criteria에 해당되는 모든 다큐먼트를 제거합니다.
 - db.book.remove({}) 모두제거
 - db.book.find({'name' : "Book1"})
 - db.book.remove({'name' : "Book1"})
7. Document list 확인(조회)
   https://velopert.com/479
   https://velopert.com/516 :sort(), limit(), skip()
 - prototype : db.collectionName.remove(query, projection)
   query	document	Optional(선택적).  다큐먼트를 조회할 때 기준을 정합니다. 기준이 없이 컬렉션에 있는 모든 다큐먼트를 조회 할때는 이 매개변수를 비우거나 비어있는 다큐먼트 { } 를 전달하세요.
   projection	document	Optional. 다큐먼트를 조회할 때 보여질 field를 정합니다.
 - db.book.find()
   { "_id" : ObjectId("56c08f3a4d6b67aafdeb88a3"), "name" : "MongoDB Guide", "author" : "Velopert" }
   { "_id" : ObjectId("56c08f474d6b67aafdeb88a4"), "name" : "NodeJS Guide", "author" : "Velopert" }
   { "_id" : ObjectId("56c0903d4d6b67aafdeb88a5"), "name" : "Book1", "author" : "Velopert" }
   { "_id" : ObjectId("56c0903d4d6b67aafdeb88a6"), "name" : "Book2", "author" : "Velopert" }
8. Document Update
   https://velopert.com/545
 - 특정 Field Update : db.book.update( { name: "Book1" }, { $set: { author: "hamburger" } } )
 - Document Replace : db.book.update( { name: "Book1" }, { "name" : "NewBook1", author: "hamburger1" } )
 - 특정 Field 제거 : db.book.update( { name: "Book1" }, { $unset: { author: "hamburger" } } )
 - criteria에 해당되는 document가 존재하지 않는다면 새로 추가하기 : db.book.update( { name: "OldBook" }, { "name" : "OldBook", author: "hamburger" } )
9. Index 생성 
   https://velopert.com/560
   검색 속도를 빠르게 하기위해 index를 생성한다.
 - db.collectionName.createIndex() // 단일 index, 복합 index, unique 속성 부여
 - db.collectionName.getIndexes()  // 생성된 index 조회시
 - db.collectionName.dropIndex()  // 생성된 index 삭제시
 - db.collectionName.dropIndexes()  // default index인 _id를 제외하고 모든 index 삭제시


[mongoose 사용]
https://velopert.com/3577
1. mongoose 설치하기
 - npm i --save mongoose



[admin DB에서 DB단위로 USER 관리할 경우]
mongoose.connect('mongodb://sdet:sdet@127.0.0.1:27017/admin', { dbName: "initiativemgr", useNewUrlParser : true }, function(error) { console.log("mongoose error = ", error)})
mongoose.connect('mongodb://initiativemgr:initiativemgr@127.0.0.1:27017/admin', { dbName: "initiativemgr", useNewUrlParser : true }, function(error) { console.log("mongoose error = ", error)})

[DB단위로 USER 관리할 경우]
mongoose.connect('mongodb://initiativemgr:initiativemgr@127.0.0.1:27017/initiativemgr', { dbName: "initiativemgr", useNewUrlParser : true }, function(error) { console.log("mongoose error = ", error)})
*/

/*
https://poiemaweb.com/mongoose
[Statics model methods & Document instance methods]
Statics model methods와 Document instance methods는 혼동하기 쉬우므로 주의가 필요하다.

위 그림에서 살펴본 바와 같이 정의된 스키마로 모델을 생성하고 모델로 도큐먼트를 생성한다. 
이때 모델은 자바스크립트의 생성자 함수와 같이 인스턴스(도큐먼트)를 생성하는 역할을 담당한다. 
모델의 메소드를 Statics model methods라 부르고 모델이 생성한 인스턴스인 도큐먼트의 메소드를 Document instance methods라 한다. 
이는 자바스크립트의 static 메소드와 프로토타입 메소드와 동일한 개념이다.
1. Static model Methods
 const Todo = mongoose.model('Todo', todoSchema);
 Todo.find({ }, function(err, todo) { if(err) throw err;  console.log(todo); });
2. Document instance methods // model instance (= document)
 var Todo = mongoose.model('Todo', todoSchema);
 var todo = new Todo({ todoid: 1, content: 'MongoDB', completed: false });
 todo.save.then(() => console.log('Saved successfully'));
3. Custom Statics & Methods (사용자 정의 Method 추가 가능)
 3.1 Instance methods : Schema의 methods property에 사용자 정의 methods를 추가
 var animalSchema = new Schema({ name: String, type: String });
 // assign a function to the 'methods' object of our animalSchema
 animalSchema.methods.findSimilarTypes = function(cb) { return this.model('Animal').find({ type: this.type }, cb); };
 3.2 Animal model의 instance는 findSimilarTypes method를 사용할 수 있다.  
 var Animal = mongoose.model('Animal', animalSchema);
 var dog = new Animal({ type: 'dog' });
 dog.findSimilarTypes(function(err, dogs) { console.log(dogs); // woof });
 3.3 Schema의 static property에 사용자 정의 method를 추가한다.
 // assign a function to the 'statics' object of our animalSchema
 animalSchema.statics.findByName = function(name, cb) { return this.find({ name: new RegExp(name, 'i') }, cb); };
 var Animal = mongoose.model('Animal', animalSchema);
 Animal.findByName('fido', function(err, animals) { console.log(animals); });
*/

var fs = require('fs');
var fse = require('fs-extra');
var mongoose = require('mongoose');
var sleep = require('sleep');
var moment = require('moment-timezone')
moment.tz.setDefault("Asiz/Seoul");

var initiative_DB = {};

var InitMgr_webOS45_MR_Minor_DB = require('./models/initiative_webOS45_MR_Minor');
const InitMgr_webOS45_MR_Minor_filename = '/home/sdet/sdetshare/workspace/InitiativeManager/public/json/initiative_DB_46093_Latest.json';

var InitMgr_webOS45_MR_Major_DB = require('./models/initiative_webOS45_MR_Major');
const InitMgr_webOS45_MR_Major_filename = '/home/sdet/sdetshare/workspace/InitiativeManager/public/json/initiative_DB_46117_Latest.json';

var InitMgr_webOS50_SEETV_DB = require('./models/initiative_webOS50_SEETV');
const InitMgr_webOS50_SEETV_filename = '/home/sdet/sdetshare/workspace/InitiativeManager/public/json/initiative_DB_45938_Latest.json';

var InitMgr_webOS50_Initial_DB = require('./models/initiative_webOS50_Initial');
const InitMgr_webOS50_Initial_filename = '/home/sdet/sdetshare/workspace/InitiativeManager/public/json/initiative_DB_45402_Latest.json';

var InitMgr_webOS50_Platform_DB = require('./models/initiative_webOS50_Platform');
const InitMgr_webOS50_Platform_filename = '/home/sdet/sdetshare/workspace/InitiativeManager/public/json/initiative_DB_48233_Latest.json';

const databaseUrl = 'mongodb://initiativemgr:initiativemgr@127.0.0.1:27017/admin';
const accessDB = "initiativemgr";

let today = new Date();


function mongo_connectDB(db_url, accessDBName)
{
    console.log("DB 연결을 시도합니다.");
    mongoose.Promise = global.Promise; // mongoose의 Promise 객체는 global의 Promise 객체를 사용하도록 함.
    mongoose.connect(db_url, { dbName: accessDBName, useNewUrlParser : true });
    
    let database = mongoose.connection;
    database.on('error', console.error.bind(console, 'mongoose connection error'));
    database.on('open', () => {
      console.log("connect to database successfully");
    });
    database.on('disconnected', () => {
      console.log("disconnected to database...");
    });
}

async function DB_Sync_PeriodicJob()
{
  console.log(process.argv);
  mongo_connectDB(databaseUrl, accessDB);
  var initiative_doc = {}; 
 
  try {
    initiative_DB = await load_InitiativeDB(InitMgr_webOS45_MR_Minor_filename);
    initiative_doc = { inserted_at : today, Snapshot_at : initiative_DB['snapshotDate'], platform : 'webOS45_MR_Minor', json: initiative_DB };
    await InitMgr_webOS45_MR_Minor_DB.insert(initiative_doc);

    initiative_DB = await load_InitiativeDB(InitMgr_webOS45_MR_Major_filename);
    initiative_doc = { inserted_at : today, Snapshot_at : initiative_DB['snapshotDate'], platform : 'webOS45_MR_Major', json: initiative_DB };
    await InitMgr_webOS45_MR_Major_DB.insert(initiative_doc);

    initiative_DB = await load_InitiativeDB(InitMgr_webOS50_SEETV_filename);
    initiative_doc = { inserted_at : today, Snapshot_at : initiative_DB['snapshotDate'], platform : 'webOS50_SEETV', json: initiative_DB };
    await InitMgr_webOS50_SEETV_DB.insert(initiative_doc);

    initiative_DB = await load_InitiativeDB(InitMgr_webOS50_Initial_filename);
    initiative_doc = { inserted_at : today, Snapshot_at : initiative_DB['snapshotDate'], platform : 'webOS50_Initial', json: initiative_DB };
    await InitMgr_webOS50_Initial_DB.insert(initiative_doc);
    
    initiative_DB = await load_InitiativeDB(InitMgr_webOS50_Platform_filename);
    initiative_doc = { inserted_at : today, Snapshot_at : initiative_DB['snapshotDate'], platform : 'webOS50_Platform', json: initiative_DB };
    await InitMgr_webOS50_Platform_DB.insert(initiative_doc);

    mongoose.disconnect();
    /*
    // 2. Read
    //InitMgr_webOS45_MR_Minor_DB.findAll().then(result => { console.log("called find all function = ", result); })
    //InitMgr_webOS45_MR_Minor_DB.query({ platform : "webOS50_Initial" }).then(result => { console.log("query result = ", result); })

    // 3. Update
    //InitMgr_webOS45_MR_Minor_DB.updateMany({platform : "webOS50_Initial"}, { platform : "webOS_4.5_MR_Minor"}).then(result => { console.log("called update function = ", result); }).catch((error) => { console.log("update error"); })

    // 4. Delete
    //InitMgr_webOS45_MR_Minor_DB.removeAll().then(result => { console.log("called remove all function = ", result); })
    */
  }
  catch(error) { console.log("file load error = ", error); }
  process.exit(0);
}


/*
  load_InitiativeDB : filename(Path정보 포함)을 읽어 initiative_DB 객체(JSON)으로 Loading한다.
*/
function load_InitiativeDB(filename)
{
  return new Promise(function (resolve, reject) {
    fs.exists(filename, (exist) => {
      if(exist)
      {
        console.log("file is exist");
        let data = fs.readFileSync(filename, 'utf8');
        initiative_DB = JSON.parse(data); 
      }
      else
      {
        console.log('Not Found!');
        initiative_DB = {};   
      }
      resolve(initiative_DB);
    });      
  });
}


/*
  Save_JSON_file : 전달된 JSON객체를 filename(Path정보 포함)으로 저장한다.
*/
function Save_JSON_file(jsonObject, filename)
{
  var json = JSON.stringify(jsonObject);
  fse.outputFileSync(filename, json, 'utf-8', function(e){
    if(e){
      console.log(e);
    }else{
      console.log("Download is done!");	
    }
  });
}



DB_Sync_PeriodicJob();