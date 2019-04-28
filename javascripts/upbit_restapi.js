const upbit = require("../config/upbit_configuration");
const jwt = require("jsonwebtoken")
const request = require("request")
const queryEncode = require("querystring").encode

var debug = false;

/*
전체 계좌 조회 : 보유 원화, 토큰에 대한 잔고 및 lock 수량, 평단가 제공.
https://docs.upbit.com/v1.0.1/reference#%EC%9E%90%EC%82%B0-%EC%A1%B0%ED%9A%8C
[
    {"currency":"KRW","balance":"0.66063486","locked":"0.0","avg_buy_price":"0","avg_buy_price_modified":true,"unit_currency":"KRW","avg_krw_buy_price":"0","modified":true},
    {"currency":"EOS","balance":"11766.46162836","locked":"0.0","avg_buy_price":"5119.12","avg_buy_price_modified":false,"unit_currency":"KRW","avg_krw_buy_price":"5119.12","modified":false}
]
*/
function get_accountbalance()
{
    const payload = {
        access_key: upbit.AccessKey,
        nonce: (new Date).getTime()
    };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "GET",
        url: "https://api.upbit.com/v1/accounts",
        headers: { Authorization: authorizationToken }
    };
      
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}


/*
 Market별 주문 가능 정보를 확인한다. 'KRW-BTC', 'KRW-EOS'......
 https://docs.upbit.com/v1.0.1/reference#%EC%A3%BC%EB%AC%B8-%EA%B0%80%EB%8A%A5-%EC%A0%95%EB%B3%B4
*/
function get_chance(marketID)
{
    const query = queryEncode({ market : marketID });
    const payload = {
        access_key : upbit.AccessKey,
        nonce : (new Date).getTime(),
        query : query,
    };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "GET",
        url: "https://api.upbit.com/v1/orders/chance?" + query,
        headers: { Authorization: authorizationToken }
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}

/*
 주문 UUID 를 통해 개별 주문건을 조회한다. 
 9d59aacb-7184-42e4-a78e-3b49beb041b4
 https://docs.upbit.com/v1.0.1/reference#%EC%A3%BC%EB%AC%B8-%EA%B0%80%EB%8A%A5-%EC%A0%95%EB%B3%B4
*/
function get_orderinfo(UUID)
{
    const query = queryEncode({ uuid : UUID });
    const payload = {
        access_key : upbit.AccessKey,
        nonce : (new Date).getTime(),
        query : query,
    };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "GET",
        url: "https://api.upbit.com/v1/order?" + query,
        headers: { Authorization: authorizationToken }
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}



/*
 주문 리스트를 조회한다.
 https://docs.upbit.com/v1.0.1/reference#%EC%A3%BC%EB%AC%B8-%EA%B0%80%EB%8A%A5-%EC%A0%95%EB%B3%B4
 MarketID : "KRW-EOS"
 State : 'wait', 'done', 'cancel'
 PageCnt : Page Count (default 1)
 orderRule : 'asc', 'desc'
*/
function get_orderslist(MarketID, State, PageCnt = 1, orderRule = 'desc')
{
    const query = queryEncode({ market : MarketID, state: State, page: PageCnt, order_by : orderRule });
    const payload = {
        access_key : upbit.AccessKey,
        nonce : (new Date).getTime(),
        query : query,
      };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "GET",
        url: "https://api.upbit.com/v1/orders?" + query,
        headers: { Authorization: authorizationToken }
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}


/*
 주문 요청
 bid : buy
 ask : sell
 https://docs.upbit.com/v1.0.1/reference#%EC%A3%BC%EB%AC%B8-%EC%B7%A8%EC%86%8C
*/
function input_orders(MarketID, Side, Volume, Price, Order_Type)
{
    const body = { market: MarketID, side: Side, volume: Volume, price: Price, ord_type: Order_Type };
    const query = queryEncode(body);
    const payload = {
        access_key : upbit.AccessKey,
        nonce : (new Date).getTime(),
        query : query,
    };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "POST",
        url: "https://api.upbit.com/v1/orders",
        headers: { Authorization: authorizationToken },
        json : body
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                //body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}



/*
 주문 취소 요청
 https://docs.upbit.com/v1.0.1/reference#%EC%A3%BC%EB%AC%B8-%EC%B7%A8%EC%86%8C
*/
function cancel_orders(UUID)
{
    const query = queryEncode({ uuid : UUID });
    const payload = {
        access_key : upbit.AccessKey,
        nonce : (new Date).getTime(),
        query : query,
    };
    const jwtToken = jwt.sign(payload, upbit.SecretKey);
    const authorizationToken = `Bearer ${jwtToken}`;
    var options = {
        method: "DELETE",
        url: "https://api.upbit.com/v1/order?" + query,
        headers: { Authorization: authorizationToken },
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}


/*
 Market Code List를 조회한다.
*/

function getMarketCodeList()
{
    var options = { method: 'GET', url: 'https://api.upbit.com/v1/market/all' };
 
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}


/*
 분봉 / 일봉 / 주봉 / 월봉을 조회한다.
 yyyy-MM-dd'T'HH:mm:ssXXX
*/
function getCandleData(MarketID, Time, Unit, Count = 200, To = "")
{
    let urlinfo = "https://api.upbit.com/v1/candles/";
    let unit = 0;
    let query = { market: MarketID, to : To, count : Count } ;

    switch(Time)
    {
        case 'MIN' : urlinfo = urlinfo + "minutes"; break;
        case 'DAY' : urlinfo = urlinfo + "days"; break;
        case 'WEEK' : urlinfo = urlinfo + "weeks"; break;
        case 'MONTH' : urlinfo = urlinfo + "months"; break;
    }

    if(Time === "MIN")
    {
        switch(Unit)
        {
            case 1: unit = "/1"; break;
            case 3: unit = "/3"; break;
            case 5: unit = "/5"; break;
            case 10: unit = "/10"; break;
            case 15: unit = "/15"; break;
            case 30: unit = "/30"; break;
            case 60: unit = "/60"; break;
            case 240: unit = "/240"; break;
            default : unit = "/10"; break;
        }
    }
    else
    {
        unit = "";
    }

    urlinfo = urlinfo + unit;

    var options = { 
        method: 'GET',
        url: urlinfo,
        qs: query
    };
    
    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                //if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}

/*
 당일 체결내역 (최대 500개 까지 가능함)
*/
function getTodayTransactionList(MarketID, Count = 500, To = "")
{
    let query = { market: MarketID, to : To, count : Count } ;
    var options = { 
        method: 'GET',
        url: 'https://api.upbit.com/v1/trades/ticks',
        qs: query 
    };

    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) 
        {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}

    

/*
 현재가 정보 : 체결이 되었을 경우에 정보가 변경되어 전송되고 체결이 되지 않으면 마지막 체결정보 기준으로 정보가 전송된다.
*/
function getCurrentPriceInfo(MarketID)
{
    let query = { markets : MarketID } ;
    var options = { 
        method: 'GET',
        url: 'https://api.upbit.com/v1/ticker',
        qs: query 
    };

    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) 
        {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}



/*
 호가정보 조회
*/
function getOrderBookInfo(MarketID)
{
    let query = { markets : MarketID } ;
    var options = { 
        method: 'GET',
        url: 'https://api.upbit.com/v1/orderbook',
        qs: query 
    };

    return new Promise(function (resolve, reject) {  
        request(options, function (error, response, body) 
        {
            //if (error) throw new Error(error);
            if(error) { reject(error); } 
            else 
            { 
                if(debug) { console.log(body); } 
                body = JSON.parse(body);
                resolve(body); 
            }
        });
    });
}

module.exports = 
{ 
    debug,
    get_accountbalance, // 현 계좌의 잔고 현황 표시
    get_chance, // 주문가능 정보 
    get_orderinfo, // UUID기반 개별주문 조회
    get_orderslist, // 주문 리스트 조회
    input_orders, // 주문하기
    cancel_orders, // 주문 취소하기
    getMarketCodeList, // Market Code List 조회
    getCandleData, // Candle Data 
    getTodayTransactionList, // 당일 체결내역
    getCurrentPriceInfo, // 현재가 정보
    getOrderBookInfo, // 호가정보 조회 (Order Book)
};