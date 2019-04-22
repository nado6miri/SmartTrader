const sleep = require('sleep');
const upbit = require("./upbit_restapi");

// default config value.......
var config_param = {
    max_slot_cnt : 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Bid_KRW : 5000,   //* fisrt investment moeny (unit : KRW)
    slot_2nd_Bid_KRW : 10000,  //* after 1st slot, investment moeny (unit : KRW)
    check_period : 5,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt : 5,              //* set retry count when restapi fails 
    target_rate : 5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_rate_adj : 1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio : -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj : -0.3, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    max_addbid_cnt : 5,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay : 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_krw : 0000,    // The limitation of invest money in current market. (unit : KRW)
    limit_invest_amount : 0000, // The limitation of cryptocurrency amount in current market. (unit : EA)
}


/*
var bid_info = {
    timetick : '2019-04-09T10:00:00',
    UID : 'uid-xx-dd-wewerew-dd-00',
    status : 'done/wait/wait_expired', 
    price : 0,
    gap : 0,
    amount : 100,
    amount_done : 90, 
    amount_wait : 10,
    amount_done_ratio : 'amount_done/amount',
    bidkw : 'p*amount_done',
    restkw : 'p*amount_wait',
    investkw : 'p*amount',
    deadline : '2019-04-10T10:00:00',
}
*/
var bid_info = {
    timetick : 0,
    UID : 0,
    status : 'none', //'none/done/wait/wait_expired', 
    price : 0,
    price_gap : 0,    // ??
    amount : 0,
    amount_done : 0, 
    amount_wait : 0,
    amount_done_ratio : 0, //'amount_done/amount',
    bidkw : 0, //'p*amount_done',
    restkw : 0, //'p*amount_wait',
    investkw : 0, //'p*amount',
    deadline : 0, //'2019-04-10T10:00:00',
}



/*
var slot_info = { 
    timetick : '2019-04-09T10:00:00',
    market : "KRW-EOS",
    type : 'first/others',
    trends_prev : 'descent/ascent/parallel',
    trends_create : 'descent', 
    trends_cur : 'descent',
    config : { },
    status : 'running / liquidation / suspend', 
    liqudation_uid : 'uid-xx-dd-wewerew-dd-00',
    statics : {
        sum_amount : 100,
        sum_amount_done : 90, 
        sum_amount_wait : 10,
        sum_amount_done_ratio : 'amount_done/amount',
        sum_bidkw : 'sum(bidkw)',
        sum_restkw : 'sum(restkw)',
        sum_investkw : 'sum(investkw)',
        average : 'sum_bidkw/sum_amount_done',
        cur_eval_net_ratio : 0.05,
        cur_eval_net_krw : 'cur_eval_net_ratio*sum_bidkw',
    },
    //last_bid_info : { timetick : '2019-04-09T10:00:00', tr_price : 6300 },
    add_bid : [ bid_info, ],
}
*/
var slot_info = { 
    timetick : 0,
    market : 0, //"KRW-EOS",
    type : 0, //'first/others',
    trends_prev : 0, //'descent/ascent/parallel',
    trends_create : 0, //'descent', 
    trends_cur : 0, //'descent',
    config : { },
    status : 0, //'running / liquidation / suspend', 
    liqudation_uid : 0, //'uid-xx-dd-wewerew-dd-00',
    statics : {
        sum_amount : 0,
        sum_amount_done : 0, 
        sum_amount_wait : 0,
        sum_amount_done_ratio : 0, //'amount_done/amount',
        sum_bidkw : 0, //'sum(bidkw)',
        sum_restkw : 0, //'sum(restkw)',
        sum_investkw : 0, //'sum(investkw)',
        average : 0, //'sum_bidkw/sum_amount_done',
        cur_eval_net_ratio : 0,
        cur_eval_net_krw : 0, //'cur_eval_net_ratio*sum_bidkw',
    },
    add_bid : [], //[ bid_info, ],
}



/*
var last_transaction = { timetick : '2019-04-09T10:00:00', tr_price : 0 }; 
*/
var last_transaction = { timetick : 0, tr_price : 0 }; 

/*
var last_transaction_info = { "KRW-EOS" : last_tr, };
*/
var last_transaction_info = { };


var portfolio = { config : config_param, last_bid_info : last_transaction_info, slots : [] }; // slot config & info......
/*
var portfolio_info = {
    "KRW-EOS" : { config : config_param, last_bid_info : last_transaction_info, slots : [slot_info, slot_info, ....] }, 
    "KRW-BTC" : { config : config_param, last_bid_info : last_transaction_info, slots : [] }, // slot config & info......
    "KRW-ETH" : { config : config_param, last_bid_info : last_transaction_info, slots : [] }, // slot config & info......
    "KRW-XRP" : { config : config_param, last_bid_info : last_transaction_info, slots : [] }, // slot config & info......
}
*/
var portfolio_info = { };

var MACD_Data = { };


/*
 1. db로 부터 market에 대한 config value를 읽어온다.
 2. db로 부터 portfolio market list를 얻어온다.
 3. 현재 marketID가 있으면 config value가 변경되었는지 확인 / 적용한다.
 4. marketID가 신규로 추가되었다면 portfolio_info에 추가하여 거래가 이루어 지도록 한다.
 5. marketID가 기존대비 삭제 되었다면 portfolio_info에서 삭제하여 bot이 동작하지 않도록 한다. 
*/ 

/*
 1/3/5/10/15/30/60/240 분봉 데이터를 이용하여 MACD 정보를 가공한다.
*/
async function get_MACD(market, min, signal, MACD)
{
    let db = [];
    let signalkey = "MACD_average" + String(signal);
    let MACDkey = "MACD_average" + String(MACD);
    let MACD_Shortkey = "MACD" + String(signal);
    let MACD_Longkey = "MACD" + String(MACD);
    let retry_cnt = 0;
    var data = 0;
    try{
        do{
            data = await upbit.getCandleData(market, "MIN", min, 200);  // 분봉
            //console.log("data = ", data, "Retry getCandleData = ", retry_cnt)
        }while(("error" in data) && retry_cnt++ < 5);
    
        return new Promise(function (resolve, reject) {  
            if("error" in data) { resolve("error"); }

            // Calculate MACD Short Term Signal average 
            let i = 0; j = 0;
            for(i = 0; i <= data.length-signal; i++)
            {
                let sum = 0, average = 0;
                for(j = i; j < i+signal; j++)
                {
                    sum += data[j]['trade_price']
                }
                average = sum / signal;
                data[i][signalkey] = average;
            }
    
            //console.log("i-1 = ", i-1, "average = ", data[i-1][signalkey]);
            data[i-1][MACD_Shortkey] = data[i-1][signalkey];
            for(i = data.length-(signal+1); i >= 0; i--)
            {
                data[i][MACD_Shortkey] = ((data[i]['trade_price'] * 2)/(signal+1)) + (data[i+1][MACD_Shortkey]*(1-2/(signal+1)));
            }
    
            // Calculate MACD Long Term Signal average 
            for(i = 0; i <= data.length-MACD; i++)
            {
                let sum = 0, average = 0;
                for(j = i; j < i+MACD; j++)
                {
                    sum += data[j]['trade_price']
                }
                average = sum / MACD;
                data[i][MACDkey] = average;
            }
    
            //console.log("i-1 = ", i-1, "average = ", data[i-1][MACDkey]);
            data[i-1][MACD_Longkey] = data[i-1][MACDkey];
            for(i = data.length-(MACD+1); i >= 0; i--)
            {
                data[i][MACD_Longkey] = ((data[i]['trade_price'] * 2)/(MACD+1)) + (data[i+1][MACD_Longkey]*(1-2/(MACD+1)));
            }
    
            for(i = 0; i <= data.length-MACD; i++)
            {
                data[i]['Price_Diff'] = (data[i]['high_price'] - data[i]['low_price']) / data[i]['trade_price'];
                data[i]['MACD_GAP'] = data[i][MACD_Shortkey] - data[i][MACD_Longkey];
                data[i]['MACD_GAP_PriceRatio'] = data[i]['MACD_GAP'] / data[i]['trade_price'];
            }
            resolve(data); 
        });   
    }
    catch(error)
    {
        console.log("[ERROR] Fail to get candle data from server...")
    }
}

/*
전체 계좌 조회 : 보유 원화, 토큰에 대한 잔고 및 lock 수량, 평단가 제공.
*/
async function smart_coin_trader()
{
    let current = 0;
    let previous = {};
    let elapsed = {};
    //console.log("portfolio = ", portfolio);
    let retry_cnt = 0;
    let timerID_1h = { };

    // 1. make portfolio_info
    let portpolio_list = [ 'KRW-EOS', 'KRW-XRP' ];
    for (index in portpolio_list)
    {
        let marketID = portpolio_list[index]
        let pfolio = JSON.parse(JSON.stringify(portfolio));
        pfolio['config'] = JSON.parse(JSON.stringify(config_param));  // todo : portfolio에 편입된 marketID별 config를 설정해야 함.
        pfolio['last_bid_info'] = JSON.parse(JSON.stringify(last_transaction));
        pfolio['slots'] = []; 
        portfolio_info[marketID] = JSON.parse(JSON.stringify(pfolio));
    }
    console.log("Portfolio = ", JSON.stringify(portfolio_info));


    // 2. create the first slot


    /*
    // make MACD Information.
    for(marketID in portfolio)
    {
        timerID_1h[marketID] = setInterval(async function () {
            let data = [];
            data = await get_MACD(marketID, 240, 9, 26);
            if(data.length > 0 && (data != "error")) { MACD_Data[marketID] = data; } 
            console.log("MACD[", marketID, "]", " = ", JSON.stringify(MACD_Data[marketID]));
        }, 1000*60*30); // 30min
    }

    console.log("timerID = ", timerID_1h);
    */

    while(0)
    {
        current = new Date();
        for(marketID in portfolio)
        {
            if(previous.hasOwnProperty(marketID) === false) { previous[marketID] = 0; }
            if(elapsed.hasOwnProperty(marketID) === false) { elapsed[marketID] = 0; }
            elapsed[marketID] = (current - previous[key])/1000;
            if(elapsed[marketID] > portfolio[marketID]['config']['check_period'])
            {
                console.log("Market = ", marketID, portfolio[marketID]['config']['check_period'], " sec priodic routine....");
                let priceinfo = await upbit.getCurrentPriceInfo(marketID);
                previous[marketID] = current;
                /*
                [{"market":"KRW-EOS",
                "trade_date":"20190420",
                "trade_time":"133320",
                "trade_date_kst":"20190420",
                "trade_time_kst":"223320",
                "trade_timestamp":1555767200000,
                "opening_price":6315.00000000,
                "high_price":6345.00000000,
                "low_price":6270.00000000,
                "trade_price":6290.0,
                "prev_closing_price":6315.00000000,
                "change":"FALL",
                "change_price":25.00000000,
                "change_rate":0.0039588282,
                "signed_change_price":-25.00000000,
                "signed_change_rate":-0.0039588282,
                "trade_volume":4.87723901,
                "acc_trade_price":4420158457.698110350,
                "acc_trade_price_24h":7191068779.42364380,
                "acc_trade_volume":700750.28812355,
                "acc_trade_volume_24h":1140790.80574210,
                "highest_52_week_price":25170.00000000,
                "highest_52_week_date":"2018-04-29",
                "lowest_52_week_price":1745.00000000,
                "lowest_52_week_date":"2018-12-07",
                "timestamp":1555767200973}]
                */
            }
        }
    }
}


//upbit.getCurrentPriceInfo("KRW-EOS");
smart_coin_trader();

module.exports = 
{ 
};
