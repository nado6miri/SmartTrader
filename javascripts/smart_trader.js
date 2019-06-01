//const sleep = require('sleep');
var fs = require('fs');
const fse = require('fs-extra');
var moment = require('moment-timezone');

const upbit = require("./upbit_restapi");
var NConfig = require("../parameters/Normal_trade_config");
var RConfig = require("../parameters/Reverse_trade_config");

const tradefee = 0.0005;
const expiredtime = 1*24*60*60*1000; // 24Hours
const MACD_Period = 1000 * 60 * 1; // 2min

var sellcoin_count = {}; // reverse mode에서 현재까지 매도된 coin 수량
var total_invest_KRW = {}; // normal mode에서 현재까지 매수/투자된 KRW 합
const trade_fee = {}; // { MARKET : { ASK : 0.05, BID : 0.05 } }

var filesave_count = 0;
const filesave_period = 12; // check_period * count = 5sec * 12 = 60sec
var expired_chk_count = 0;
const expired_chk_period = 12; // check_period * count = 5sec * 12 = 60sec

// normal mode
var bid_info = {
    order_info : 0, 
    deadline : 0, //'2019-04-10T10:00:00',
    price_info : 0,
    amount : 0,
    invest_KRW : 0, //'p*amount',
    status : 'none', //'none/done/wait/wait_expired', 
}

// reverse mode
var ask_info = {
    order_info : 0, 
    deadline : 0, //'2019-04-10T10:00:00',
    price_info : 0,
    amount : 0,
    invest_KRW : 0, //'p*amount',
    status : 'none', //'none/done/wait/wait_expired', 
}


// normal mode
var statics_bid_info = {
    current_price : 0,
    sum_amount : 0,
    sum_amount_done : 0, 
    sum_amount_wait : 0,
    sum_amount_done_ratio : 0, //'amount_done/amount',
    sum_bid_KRW : 0, //'sum(bidkw)',
    sum_bid_KRW_withfee: 0, //'sum(bidkw)',
    sum_rest_KRW : 0, //'sum(restkw)',
    sum_invest_KRW : 0, //'sum(investkw)',
    sum_invest_KRW_withfee: 0, //'sum(investkw)',
    average : 0, //'sum_bidkw/sum_amount_done',
    average_withfee: 0, //'with fee',
    cur_eval_net_ratio : 0,
    cur_eval_net_KRW: 0, //'cur_eval_net_ratio*sum_bidkw',
}


// reverse mode
var statics_ask_info = {
    current_price : 0,
    sum_amount : 0,
    sum_amount_done : 0, 
    sum_amount_wait : 0,
    sum_amount_done_ratio : 0, //'amount_done/amount',
    sum_ask_KRW : 0, //'sum(askkw)',
    sum_ask_KRW_withfee: 0, //'sum(askkw)',
    sum_rest_KRW : 0, //'sum(restkw)',
    sum_reclaim_KRW : 0, //'sum(investkw)',
    sum_reclaim_KRW_withfee: 0, //'sum(investkw)',
    average : 0, //'sum_bidkw/sum_amount_done',
    average_withfee: 0, //'with fee',
    cur_eval_net_ratio : 0,
    cur_eval_net_Coin : 0, //'cur_eval_net_ratio*sum_askkw',
}


// normal mode
var slot_bid_info = { 
    timetick : 0,
    market : 0, //"KRW-EOS",
    marketID : 0, // ID1, ID2 ...
    type : 0, //'first/others',
    trends_prev : 0, //'descent/ascent/parallel',
    trends_create : 0, //'descent', 
    trends_cur : 0, //'descent',
    status : 0, //'running / liquidation / suspend', 
    liquidation_orderinfo : 0, //'uid-xx-dd-wewerew-dd-00',
    statics : {},
    add_bid : [], //[ bid_info, ],
    last_bidask_info : { timetick : 0, tr_price : 0 },
}


// reverse mode
var slot_ask_info = { 
    timetick : 0,
    market : 0, //"KRW-EOS",
    marketID : 0, // ID1, ID2 ...
    type : 0, //'first/others',
    trends_prev : 0, //'descent/ascent/parallel',
    trends_create : 0, //'descent', 
    trends_cur : 0, //'descent',
    status : 0, //'running / liquidation / suspend', 
    increasecoin_orderinfo : 0, //'uid-xx-dd-wewerew-dd-00',
    statics : {},
    add_ask : [], //[ ask_info, ],
    last_bidask_info : { timetick : 0, tr_price : 0 },
}

var portfolio = { config : { }, last_bidask_info : { timetick : 0, tr_price : 0 }, slots : [], idle : false }; // slot config & info......
var portfolio_info = { };



var MACD = { T5min : {}, T15min : {}, T30min : {}, T60min : {}, T240min : {}, T1day : {}, Tweek : {} };
/*
var MACD_info = { 
    "KRW-EOS" : { T5min : {}, T15min : {}, T30min : {}, T60min : {}, T240min : {}, T1day : {}, Tweek : {} },
    "KRW-BTC" : { T5min : {}, T15min : {}, T30min : {}, T60min : {}, T240min : {}, T1day : {}, Tweek : {} }, 
};
*/
var MACD_info = { };

var timerID = { T5min : 0, T15min : 0, T30min : 0, T60min : 0, T240min : 0, days : 0, weeks : 0 };  // common data for all coin.
var timerID_Minval = { T5min : 1, T15min : 1, T30min : 1, T60min : 1, T240min : 1, days : 1, weeks : 1 };  // common data for all coin.
/*
var timerID_info = { 
    "KRW-EOS" : { T5min : 0, T15min : 0, T30min : 0, T60min : 0, T240min : 0, T1day : 0, Tweek : 0 },
    "KRW-BTC" : { T5min : 0, T15min : 0, T30min : 0, T60min : 0, T240min : 0, T1day : 0, Tweek : 0 }, 
}
*/
var timerID_info = { }
var liquidation_DB = { }; //{ 'KRW-EOS' : { ID1 : [ { }, { } ], ID2 : [ {}, {}] }, };
var increasecoin_DB = {}; //{ 'KRW-EOS' : { ID1 : [ { }, { } ], ID2 : [ {}, {}] }, };


// 1. make portfolio_info
var portfolio_list = { };
var cancel_orderlist = { };

function * price_generator(min, max, step, start, direction)
{
    let cur_price = start;

    while(1)
    {
        if(direction)   // true : increase
        {
            if(max > cur_price) { cur_price += step; } else { direction = false; }
        }
        else    // false : decrease
        {
            if(cur_price > min) { cur_price -= step; } else { direction = true; }
        }
        yield cur_price;
    }
}

//var getPrice = { 'KRW-EOS' : { 'ID1' : 0, 'ID2' : 0, 'ID3' : 0 } };
var getPrice = { 
    'KRW-EOS' : {  },
    'KRW-XRP' : {  },
    'KRW-BTC' : {  },
    'KRW-BCH' : {  },
    'KRW-ETH' : {  },
};

/*
getPrice['KRW-EOS']['ID1'] = price_generator(9000, 30000, 50, 9000, true); // Generator - to test reverse mode
getPrice['KRW-EOS']['ID2'] = price_generator(2000, 20000, 50, 20000, false); // Generator - to test normal mode
getPrice['KRW-XRP']['ID1'] = price_generator(100, 1000, 10, 500, true); // Generator - to test reverse mode
getPrice['KRW-XRP']['ID2'] = price_generator(100, 1000, 10, 500, false); // Generator - to test normal mode
getPrice['KRW-ETH']['ID2'] = price_generator(100000, 200000, 50, 200000, false); // Generator
getPrice['KRW-BCH']['ID3'] = price_generator(100000, 330000, 50, 330000, false); // Generator
getPrice['KRW-XRP']['ID4'] = price_generator(100, 500, 1, 500, false); // Generator
getPrice['KRW-BTC']['ID5'] = price_generator(3000000, 7000000, 5000, 3000000, true); // Generator
*/

let nowdate = new Date();
let year = nowdate.getFullYear().toString();
let month = nowdate.getMonth() + 1; month = month.toString(); month.padStart(2, '0');
let date = nowdate.getDate(); date = date.toString(); date.padStart(2, '0');
let hours = nowdate.getHours(); hours = hours.toString(); hours = hours.padStart(2, '0');
let minutes = nowdate.getMinutes(); minutes = minutes.toString(); minutes = minutes.padStart(2, '0');
var suffix = year + "-" + month + "-" + date + "T" + hours + minutes;
var config_filename = {}; 


async function register_trade_markets()
{
    // read portfolio json file.... : 투자목록 list를 portfolio_list 에서 가져온다.
    portfolio_list = await Load_JsonDB("./parameters/" + "portfolio_list");
    //console.log("portfolio_list = ", JSON.stringify(portfolio_list));

    // initialize portfolio info DB...
    for (key in portfolio_list)
    {
        let market, marketID;
        market = marketID = key;
        marketID = marketID.split('_')[1];
        market = market.split('_')[0];

        let pfolio = JSON.parse(JSON.stringify(portfolio));
        let configparam = {};
        let direction = true;

        if (portfolio_list[key][0] == 'N') { configparam = NConfig.params[portfolio_list[key][1]]; direction = false; } else { configparam = RConfig.params[portfolio_list[key][1]]; direction = true; }
        pfolio['config'] = configparam;
        pfolio['slots'] = [];

        // 기존 만들어 놓은 Portfolio_info는 그대로 유지하고 신규로 추가된 Market / MarketID에 대해서 key/value를 구성한다.
        if (portfolio_info.hasOwnProperty(market) === false)
        {
            portfolio_info[market] = {};
            portfolio_info[market][marketID] = JSON.parse(JSON.stringify(pfolio));

            // config file naming and create config file and latest file.
            config_filename[market] = {};
            config_filename[market][marketID] = "Config[" + market + "][" + marketID + "]";
            Save_JSON_file(portfolio_info[market][marketID]['config'], "./output/" + config_filename[market][marketID]);
            Save_JSON_latest_file(portfolio_info[market][marketID]['config'], "./output/" + config_filename[market][marketID]);
            getPrice[market][marketID] = price_generator(portfolio_list[key][2], portfolio_list[key][3], portfolio_list[key][4], portfolio_list[key][5], direction);
        }
        else
        {
            if (portfolio_info[market].hasOwnProperty(marketID) === false)
            {
                portfolio_info[market][marketID] = JSON.parse(JSON.stringify(pfolio));
                // config file naming and create config file and latest file.
                config_filename[market][marketID] = "Config[" + market + "][" + marketID + "]";
                Save_JSON_file(portfolio_info[market][marketID]['config'], "./output/" + config_filename[market][marketID]);
                Save_JSON_latest_file(portfolio_info[market][marketID]['config'], "./output/" + config_filename[market][marketID]);
                getPrice[market][marketID] = price_generator(portfolio_list[key][2], portfolio_list[key][3], portfolio_list[key][4], portfolio_list[key][5], direction);
            }
        }

        if (liquidation_DB.hasOwnProperty(market) === false) { liquidation_DB[market] = {}; }
        if (liquidation_DB[market].hasOwnProperty(marketID) === false) { liquidation_DB[market][marketID] = []; }

        if (increasecoin_DB.hasOwnProperty(market) === false) { increasecoin_DB[market] = {}; }
        if (increasecoin_DB[market].hasOwnProperty(marketID) === false) { increasecoin_DB[market][marketID] = []; }

        if (total_invest_KRW.hasOwnProperty(market) === false) { total_invest_KRW[market] = {}; }
        if (total_invest_KRW[market].hasOwnProperty(marketID) === false) { total_invest_KRW[market][marketID] = 0; }

        if (sellcoin_count.hasOwnProperty(market) === false) { sellcoin_count[market] = {}; sellcoin_count[market][marketID] = 0; }
        if (sellcoin_count[market].hasOwnProperty(marketID) === false) { sellcoin_count[market][marketID] = 0; }
    }
    /*
    console.log("portfolio_info = ", JSON.stringify(portfolio_info));
    console.log("liquidation_DB = ", JSON.stringify(liquidation_DB));
    console.log("increasecoin_DB = ", JSON.stringify(increasecoin_DB));
    console.log("Config_FileName = ", JSON.stringify(config_filename));
    */
}


async function register_MACD_Timers(plist)
{
    for (pfkey in plist)
    {
        let market, marketID;
        market = marketID = pfkey;
        market = market.split('_')[0];
        marketID = marketID.split('_')[1];

        timerID_info[market] = JSON.parse(JSON.stringify(timerID));
        for (key in timerID_info[market])
        {
            let data = [];
            let timeval = "MIN";

            if (key === "days") { timeval = "DAY"; } else if (key === "weeks") { timeval = "WEEK"; } else { timeval = "MIN"; }
            console.log("start timer : key = ", key, " market = ", market, "time = ", timerID_Minval[key], timerID_info[market][key]);

            if (timerID_info[market][key] === 0)
            {
                data = await get_MACD(market, timeval, timerID_Minval[key], 9, 26);
                if (data.length > 0 && (data != "error"))
                {
                    if (MACD_info.hasOwnProperty(market) === false) { MACD_info[market] = {}; }
                    MACD_info[market][key] = data;
                }
                data = [];
                //console.log("First Init ==> MACD_info[", market, "][", key, "] MACD_info = ", JSON.stringify(MACD_info[market][key]));
            }

            // create timer
            timerID_info[market][key] = setInterval(async function () {
                data = await get_MACD(market, timeval, timerID_Minval[key], 9, 26);
                if (data.length > 0 && (data != "error")) { MACD_info[market][key] = data; }
                //Save_JSON_file(MACD_info, "./output/macd_infomation");
            }, timerID_Minval[key] * MACD_Period);
            //console.log("TimerID_info[", market, "][", key, "] = ", timerID_info[market][key]);
        }
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
    let priceinfo = {};

    // 1. Initialize Portfolio DB
    await register_trade_markets();

    // 2. make MACD Information.
    await register_MACD_Timers(portfolio_list);

    // 3. create the first slot
    while(1)
    {
        current = new Date();

        for(market in portfolio_info)
        {
            if(previous.hasOwnProperty(market) === false) { previous[market] = { }; }
            if(elapsed.hasOwnProperty(market) === false) { elapsed[market] = { }; }
            if (trade_fee.hasOwnProperty(market) === false)
            {
                trade_fee[market] = {};
                if (trade_fee[market]['bid_fee'] === false) { trade_fee[market]['bid_fee'] = 0.0005; }
                if (trade_fee[market]['ask_fee'] === false) { trade_fee[market]['ask_fee'] = 0.0005; }
            }
    
            for(marketID in portfolio_info[market])
            {
                if(previous[market].hasOwnProperty(marketID) === false) { previous[market][marketID] = 0; }
                if(elapsed[market].hasOwnProperty(marketID) === false) { elapsed[market][marketID] = 0; }

                elapsed[market][marketID] = (current - previous[market][marketID])/1000;

                if (portfolio_info[market][marketID]['config']['simulation']) { portfolio_info[market][marketID]['config']['check_period'] = 1; }

                if (elapsed[market][marketID] > portfolio_info[market][marketID]['config']['check_period'])
                {
                    // 신규로 trading coin이 추가되면 DB 구성하고 Config file 생성 후 다시 config를 읽어 들인다.
                    await register_trade_markets();
                    portfolio_info[market][marketID]['config'] = await Load_JsonDB("./output/" + config_filename[market][marketID]);
                    let controlMode = portfolio_info[market][marketID]['config']['control_mode'];
                    let tradeMode = portfolio_info[market][marketID]['config']['trade_mode'];

                    if (priceinfo.hasOwnProperty(market) === false) { priceinfo[market] = {}; }
                    if (priceinfo[market].hasOwnProperty(marketID) === false) { priceinfo[market][marketID] = {}; }
                    previous[market][marketID] = current;

                    if (controlMode !== "run") { console.log("[", market, "][", marketID, "] control Mode is Stop Mode"); continue; }

                    if (portfolio_info[market][marketID]['config']['simulation'])
                    {
                        let cur_p = getPrice[market][marketID].next().value;
                        priceinfo[market][marketID]['trade_price'] = cur_p;
                        //console.log("[", market, "][", marketID, "] Current = ", current, " priceinfo = ", priceinfo[market][marketID]['trade_price']);
                    }
                    else
                    {
                        //console.log("[", market, "][", marketID, "]", portfolio_info[market][marketID]['config']['check_period'], " sec priodic routine....");
                        let cur_price = await upbit.getCurrentPriceInfo(market);
                        priceinfo[market][marketID] = cur_price[0];
                    }

                    if(tradeMode === "normal")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        await create_new_bid_slot(market, marketID, current, priceinfo[market][marketID]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                        await add_bid_to_slot(market, marketID, current, priceinfo[market][marketID]); 

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        await update_Normal_TrInfo_Statics(market, marketID, priceinfo[market][marketID]);

                        // 최종 정리된 DB 기준으로 수익율을 조사하고 수익이 났으면 청산한다.
                        // (마지막 하나 남은 slot이면 청산하지 않고 수익분만 청산하고 초기 투자 금액은 유지한다. 또는 청산하고 last bid price 기준 하락시 new slot을 생성한다. 우선 후자로 결정함.)
                        await ask_sellCoin_buyKRW(market, marketID, current, priceinfo[market][marketID]);
                    }
                    else if(tradeMode === "reverse")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        await create_new_ask_slot(market, marketID, current, priceinfo[market][marketID]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                        await add_ask_to_slot(market, marketID, current, priceinfo[market][marketID]); 

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        await update_Reverse_TrInfo_Statics(market, marketID, priceinfo[market][marketID]);

                        // 최종 정리된 DB 기준으로 수익율을 조사하고 수익이 났으면 청산한다.
                        // (마지막 하나 남은 slot이면 청산하지 않고 수익분만 청산하고 초기 투자 금액은 유지한다. 또는 청산하고 last bid price 기준 하락시 new slot을 생성한다. 우선 후자로 결정함.)
                        await bid_sellKRW_buyCoin(market, marketID, current, priceinfo[market][marketID]);
                    }
                    else
                    {
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                        console.log("========= Configuration Error =============");
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                    }

                    // expired 된 거래에 대해 취소여부를 결정하고 취소/유지 처리를 한다. 
                    if (expired_chk_count >= expired_chk_period) { fexpired_chk_count = 0; await cancel_oldorders(market, marketID, current); }
                    filesave_count++;
                    expired_chk_count++;
                }
            }
            await disiplay_statics(current, priceinfo);
        }
    }
}

/*
  정해진 만큼 하락폭이 발생하면 신규 slot을 생성하여 가지고 현금으로 있는 coin을 매수한다.
*/
async function create_new_bid_slot(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let last_bidask_price = portfolio_info[market][marketID]['last_bidask_info']['tr_price'];
    let current_price = priceinfo['trade_price'];
    let gap_ratio = (current_price - last_bidask_price) * 100 / (last_bidask_price + 1); // +1 to protect divid by zero : 하락장에서 last_bidask 가격이 10000 이고, 현재 가격이 9000 원이면 -10% 임.

    config['minimum_order_coin'] = (config['minimum_order_KRW'] * 1.1) / current_price;  // (500 KRW * 1.1) / current price

    if (slots.length >= config['max_slot_cnt']) { return; }

    // 첫번째 slot == 0 이고 last_bidask_price == 0 이면 즉시 slot을 생성해야 하기 때문에 gap_ratio Check를 하지 않고 현재가 기준 즉시 slot을 생성한다.
    if (slots.length > 0 || last_bidask_price > 0) // last_bidask_price가 0이 아니고 slots_length가 0 인 case는 slot을 모두 청산했을 경우에 발생한다.
    {
        if (slots.length == 0)
        {
            if (config['restart_flag'] == 0)
            {
                portfolio_info[market][marketID]['idle'] = true;
                //console.log("[N][", market, "][", marketID, "] Slot is Empty!! Auto Restart Flag is FALSE, go to Idle state!!");
                return;
            }
            else if (config['restart_flag'] == 1) // one shot mode
            {
                console.log("[N][", market, "][", marketID, "]*** Restart Trader with current price, make new first slot!!! ***");
                config['restart_flag'] = 0; // restart_flag를 0으로 초기화 안해주면 자동 auto start mode가 됨. 마지막 last bidask 값에서 정해놓은 % 하락시 재매수함.
                portfolio_info[market][marketID]['idle'] = false;
                Save_JSON_latest_file(config, "./output/" + config_filename[market][marketID]);
            }
            else 
            {
                // auto repeat mode.....
                portfolio_info[market][marketID]['idle'] = false;
            } 
        }
        else
        {
            // 현재 Gap이 정해놓은 신규 slot 생성 조건보다 크면 slot을 생성하지 않고 return 처리 한다. 즉 더 많이 하락해서 값이 작아야 slot을 생성하는 조건이 된다.
            if ((gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; } // -5% > -6% return, -7% <= -6% : create new slot.
        }
    }

    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_bid_info));
    let new_bid = JSON.parse(JSON.stringify(bid_info));
    let orderinfo = {};

    // slot is empty...
    if (slots.length === 0)
    {
        new_slot['type'] = "first";
        new_bid['amount'] = portfolio_info[market][marketID]['config']['slot_1st_Bid_KRW'] / current_price; //priceinfo['trade_price'];
        new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);
        new_bid['invest_KRW'] = portfolio_info[market][marketID]['config']['slot_1st_Bid_KRW'];
        //console.log("[", market, "][", marketID, "] Create New 1st Slots. Price = ", current_price);
        if (new_bid['invest_KRW'] >= config['limit_invest_KRW']) { return; }
    }
    else // second/others slot creation condition.
    {
        new_slot['type'] = "others";
        new_bid['amount'] = portfolio_info[market][marketID]['config']['slot_2nd_Bid_KRW'] / current_price; //priceinfo['trade_price'];
        new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);
        new_bid['invest_KRW'] = portfolio_info[market][marketID]['config']['slot_2nd_Bid_KRW'];
        //console.log("[", market, "][", marketID, "] Create additional Slots. Price = ", current_price, "Fall Gap = ", (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']));
        if((total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config['limit_invest_KRW'])
        {
            //console.log("[Create New Slots] == (total_invest_KRW[market][marketID] + orderinfo['invest_KRW']) >= limit_invest_KRW");
            return;
        }
    }

    // Order Input (add bid)
    if(config['simulation'])
    {
        orderinfo['uuid'] = "ddddddddddd-dddddddd";
        orderinfo['state'] = "done";
        orderinfo['volume'] = new_bid['amount'];                            
        orderinfo['executed_volume'] = new_bid['amount'];   
        orderinfo['remaining_volume'] = 0;
        orderinfo['price'] = current_price; 
    }
    else
    {
        // 잔고 Check후 input order
        let SYM = market.split('-')[0]; // KRW
        let balance = await upbit.get_chance(market);
        let order_money = (new_bid['amount'] * current_price);

        trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];
        order_money = order_money * (1 + tradefee); // 매수 주문시 잔고는 수수료 포함해서 주문량보다 많거나 같아야 함.

        if (balance['bid_account']['currency'] === SYM && balance['market']['id'] === market)
        {
            if(balance['bid_account']['balance'] >= order_money) // Order Input (add bid)
            {
                if (config['real_test_mode'])
                {
                    orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = 1; new_bid['invest_KRW'] = new_bid['amount'] * current_price;
                }
                else // real mode
                {
                    orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                }
                //console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
            }
            else if (balance['bid_account']['balance'] >= config['minimum_order_KRW'])  // system 최소 주문 금액보다 커야 주문을 낼 수 있다.
            {
                let org_bid = new_bid['amount'];
                order_money = balance['bid_account']['balance'];
                new_bid['amount'] = order_money / current_price;
                new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee - 수수료 고려하여 주문할 수 있는 최대 코인을 주문한다.
                new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);

                if (config['real_test_mode'])
                {
                    orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = 1; new_bid['invest_KRW'] = new_bid['amount'] * current_price;
                }
                else
                {
                    orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                }
                console.log("[", market, "][", marketID, "] Insuffient Balance on your account!!! adjust input order amount!!");
                console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " orgBid = ", org_bid, " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
            }
            else { console.log("[", market, "][", marketID, "] **********Check Minimum Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
        }
        else { console.log("[", market, "][", marketID, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
    }

    if("error" in orderinfo) 
    { 
        console.log ("[", market, "][", marketID, "] Input Order Error : Can't create new slot...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
        console.log ("[", market, "][", marketID, "] Message = ", orderinfo['error']['message']); 
    }
    else 
    { 
        orderinfo['volume'] *= 1;
        orderinfo['executed_volume'] *= 1;
        orderinfo['remaining_volume'] *= 1;
        orderinfo['price'] *= 1;

        new_slot['timetick'] = current;
        new_slot['market'] = market;
        new_slot['marketID'] = marketID;
        new_slot['trends_prev'] = 0; // need to call MACD and check trends.
        new_slot['trends_create'] = 0; // need to call
        new_slot['trends_cur'] = 0;
        new_slot['status'] = "running";
        new_slot['liquidation_orderinfo'] = 0;

        // bid information
        new_bid['order_info'] = orderinfo;
        new_bid['deadline'] = new Date(Date.now() + expiredtime); 
        new_bid['price_info'] = priceinfo; 
        new_bid['status'] = orderinfo['state'];
        new_slot['add_bid'].push(new_bid);
        //console.log("[", market, "][", marketID, "] ################### New Slot - 1st Bid is added ################################");

        // check bid status : wait / done / 
        new_slot['last_bidask_info']['timetick'] = current;
        new_slot['last_bidask_info']['tr_price'] = current_price; 
        slots.push(JSON.parse(JSON.stringify(new_slot)));

        // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
        if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] == 0 
            || portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > new_slot['last_bidask_info']['tr_price'])
        {
            //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", new_slot['last_bidask_info']['tr_price'])
            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = new_slot['last_bidask_info']['timetick'];
            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = new_slot['last_bidask_info']['tr_price'];
        } 
    }
}


/*
물타기 함수 : 현재 slot 기준에서 last bid에서 config에 정의된 하락율을 초과할 경우 물타기 진행함.
*/
async function add_bid_to_slot(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    let i = 0, j = 0;
    for(i = 0; i < slots.length; i++)
    {
        let bid_sum = 0;
        let last_bidask_price = slots[i]['last_bidask_info']['tr_price'];
        let bid = slots[i]['add_bid'];

        for(j = 0; j < bid.length; j++)
        {
            bid_sum += bid[j]['amount'];
            bid_sum *= 1;
        }

        let gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1);

        if(bid.length >= config['max_addbid_cnt']) 
        { 
            //console.log("[", market, "][", marketID, "][", i, "] bid.length(count) = ", bid.length, " j = ", j, " exceed max_addbid_cnt[",config['max_addbid_cnt'], "]" );
        }
        else
        {
            if(gap_ratio < (config['new_addbid_Create_Ratio'] + config['new_addbid_Create_Ratio_adj'])) 
            {
                // Order Input (add bid)
                let new_bid = JSON.parse(JSON.stringify(bid_info));
                let orderinfo = { };

                new_bid['amount'] = bid_sum;
                new_bid['invest_KRW'] = bid_sum * current_price;

                if ((total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config['limit_invest_KRW'])
                {
                    //console.log("[Create New bid] == (total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config[limit_invest_KRW]");
                    return;
                }

                if (config['simulation'])
                {
                    orderinfo['state'] = "done";
                    orderinfo['volume'] = bid_sum;
                    orderinfo['executed_volume'] = bid_sum;
                    orderinfo['remaining_volume'] = 0;
                    orderinfo['price'] = current_price; 
                }
                else
                {
                    // 잔고 Check후 input order
                    let balance = await upbit.get_chance(market);
                    let order_money = (new_bid['amount'] * current_price);
                    trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];
                    order_money = order_money * (1 + tradefee); // 수수료 포함 매입 코인 금액이 잔고보다 커야 정상 bid 됨.  
                    if(balance['bid_account']['currency'] == "KRW" && balance['market']['id'] === market)
                    {
                        if(balance['bid_account']['balance'] >= order_money) // Order Input (add bid)
                        {
                            if (config['real_test_mode'])
                            {
                                orderinfo = await upbit.input_orders(market, 'bid', 2, current_price, 'limit'); new_bid['amount'] = bid_sum = 1;
                            }
                            else
                            {
                                orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                            }
                            //console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
                        }
                        else if (balance['bid_account']['balance'] >= config['minimum_order_KRW'])  // system 최소 주문 금액보다 커야 주문을 낼 수 있다.
                        {
                            order_money = balance['bid_account']['balance'];
                            let org_bid_sum = new_bid['amount'];
                            new_bid['amount'] = order_money / current_price;
                            new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee - 수수료 고려하여 주문할 수 있는 최대 코인을 주문한다.
                            new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);

                            if (real_test_mode)
                            {
                                orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = bid_sum = 1;
                            }
                            else
                            {
                                orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                            }
                            console.log("[", market, "][", marketID, "] Insuffient Balance on your account!!! adjust input order amount!!");
                            console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " orgBid_sum = ", org_bid_sum, " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
                        }
                        else { console.log("[", market, "][", marketID, "] **********Check Minimum Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
                    }
                    else { console.log("[", market, "][", marketID, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
                }

                if("error" in orderinfo) 
                {
                    console.log ("[", market, "][", marketID, "] Input Order Error : Can't create new additional bid...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
                    console.log ("[", market, "][", marketID, "] Message = ", orderinfo['error']['message']); 
                }
                else
                {
                    orderinfo['volume'] *= 1;
                    orderinfo['executed_volume'] *= 1;
                    orderinfo['remaining_volume'] *= 1;
                    orderinfo['price'] *= 1;

                    // bid information
                    new_bid['order_info'] = orderinfo;
                    new_bid['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
                    //new_bid['deadline'] = moment(current).add(24, 'Hour');
                    new_bid['price_info'] = priceinfo; 
                    new_bid['amount'] = bid_sum;
                    new_bid['invest_KRW'] = bid_sum * current_price;
                    new_bid['status'] = orderinfo['state'];
                    slots[i]['add_bid'].push(new_bid);
                    //console.log("[", market, "][", marketID, "][", i, "][", j, "] Amount = ", bid_sum, " ################### Additional Bid is added ################################");

                    // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
                    slots[i]['last_bidask_info']['timetick'] = current;
                    slots[i]['last_bidask_info']['tr_price'] = current_price;
                
                    if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > slots[i]['last_bidask_info']['tr_price'])
                    {
                        //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", slots[i]['last_bidask_info']['tr_price'])
                        portfolio_info[market][marketID]['last_bidask_info']['timetick'] = slots[i]['last_bidask_info']['timetick'];
                        portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = slots[i]['last_bidask_info']['tr_price'];
                    } 
                }
            } 
        }
    }
}

/*
수익실현 함수 : 현재 slot 단위로 config에 정의된 target rate를 초과한 이익이 발생할 경우 Coin을 팔아 현금으로 수익 실현을 한다. 
*/
async function ask_sellCoin_buyKRW(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    for(i = 0; i < slots.length; i++)
    {
        let target = config['target_ask_rate'] + config['target_ask_rate_adj'];
        let cur_slot_statics = slots[i]['statics'];
        let cur_eval_net_ratio = cur_slot_statics['cur_eval_net_ratio'];
        let sum_amount_done = cur_slot_statics['sum_amount_done'];
        let average = cur_slot_statics['average_withfeee'];
        let sum_invest_KRW = cur_slot_statics['sum_invest_KRW'];
        let cur_eval_net_KRW = cur_slot_statics['cur_eval_net_KRW'];

        if((cur_eval_net_ratio*100) > target) 
        {
            //console.log("################### Liquidation ######################")
            //console.log("[", market, "][", marketID, "][slots", i, "] Target = ", target, " Current Eval net Ratio = ", (cur_eval_net_ratio*100), "%"); 
            //console.log("[", market, "][", marketID, "][slots", i, "] Average Price = ", average, " Liquidation Price = ", current_price, " Amount = ", sum_amount_done); 
            //console.log("[", market, "][", marketID, "][slots", i, "] sum_invest_KRW = ", sum_invest_KRW, " Sum of Net Profit(KRW,이익) = ", cur_eval_net_KRW); 
            let orderinfo = { };
            if(config['simulation'])
            {
                orderinfo['state'] = "done";
                orderinfo['volume'] = sum_amount_done;
                orderinfo['executed_volume'] = sum_amount_done;
                orderinfo['remaining_volume'] = 0;
                orderinfo['price'] = current_price; 
                //console.log("[", market, "][", marketID, "][slots", i, "] price = ", current_price, " input order amount = ", sum_amount_done, " cur_eval_net_KRW = ", cur_eval_net_KRW);
                slots[i]['status'] = "liquidation"; // ask is completed
                slots[i]['liquidation_orderinfo'] = orderinfo;
                let liquidData = slots[i];
                liquidData['config'] = config;
                //liquidation_DB[market][marketID].push(slots[i]);
                liquidation_DB[market][marketID].push(liquidData);
                slots.splice(i, 1);
                // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                // config['restart_flag'] == 0 일경우 slots이 모두 청산되었을때 slot을 생성하지 않는 stop 상태(idle)로 대기해야 함.
                if (i == 0) // Slots이 모두 청산되었을 경우
                { 
                    portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                    portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                }
            }
            else
            {
                // 잔고 Check후 input order
                let balance = await upbit.get_chance(market);
                trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];

                if (balance['market']['id'] === market)
                {
                    if(balance['ask_account']['balance'] >= sum_amount_done) // Order Input (add ask)
                    {
                        orderinfo = await upbit.input_orders(market, 'ask', sum_amount_done, current_price, 'limit');
                        //console.log("[", market, "][", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                        slots[i]['status'] = "liquidation"; // ask is completed

                        orderinfo['volume'] *= 1;
                        orderinfo['executed_volume'] *= 1;
                        orderinfo['remaining_volume'] *= 1;
                        orderinfo['price'] *= 1;

                        slots[i]['liquidation_orderinfo'] = orderinfo;
                        let liquidData = slots[i];
                        liquidData['config'] = config;
                        //liquidation_DB[market][marketID].push(slots[i]);
                        liquidation_DB[market][marketID].push(liquidData);
                        slots.splice(i, 1);
                        // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                        if (i == 0) // Slots이 모두 청산되었을 경우 
                        {
                            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                        }
                    }
                    else
                    {
                        if (balance['bid_account']['balance'] >= (sum_amount_done * 0.9))
                        {
                            // 잔고 부족시 남은 잔고라도 익절을 할지.... 그냥 slot을 유지할지.....고민 필요함. 우선 그냥 error message만 표시하고 유지하는 것으로 작성함.
                            orderinfo = await upbit.input_orders(market, 'ask', balance['ask_account']['balance'], current_price, 'limit');
                            console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Please check your Coin Balance!!");
                            console.log("[", market, "][", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);

                            orderinfo['volume'] *= 1;
                            orderinfo['executed_volume'] *= 1;
                            orderinfo['remaining_volume'] *= 1;
                            orderinfo['price'] *= 1;
                            slots[i]['liquidation_orderinfo'] = orderinfo;
                            slots[i]['status'] = "liquidation"; // ask is completed

                            let liquidData = slots[i];
                            liquidData['config'] = config;
                            liquidation_DB[market][marketID].push(liquidData);
                            slots.splice(i, 1);
                            // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                            if (i == 0) // Slots이 모두 청산되었을 경우
                            {
                                portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                                portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                            }
                        }
                        else
                        {
                            console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Can't sell coin... Please check your Coin Balance!!");
                            console.log("[", market, "][", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                        }

                    }
                }
                else { console.log("[", market, "][", marketID, "][slots", i, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
            }
        }
    }
}


/*
통계 집계 : Normal Mode에 대해서 현재 slot 단위로 관리되는 거래에 대한 통계를 작성 및 관리한다.
*/
async function update_Normal_TrInfo_Statics(market, marketID, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    total_invest_KRW[market][marketID] = 0;

    let i = 0, j = 0;
    for(i = 0; i < slots.length; i++)
    {
        // unit slot 
        let statics = JSON.parse(JSON.stringify(statics_bid_info)); 
        for(j = 0; j < slots[i]['add_bid'].length; j++)
        {
            let bidinfo = slots[i]['add_bid'][j];
            let orderinfo = bidinfo['order_info'];
            if(bidinfo['status'] !== "done")
            {
                let uuid = bidinfo['order_info']['uuid'];
                orderinfo = await upbit.get_orderinfo(uuid);
                if("error" in orderinfo) 
                { 
                    console.log("[", market, "][", marketID, "][", i, "][", j, "] UUID = ", uuid, " [update_Normal_TrInfo_Statics] ERROR Get Order info ################################");
                    continue; //break;  // TBT (to be tested)
                }
            }

            orderinfo['volume'] *= 1;
            orderinfo['executed_volume'] *= 1;
            orderinfo['remaining_volume'] *= 1;
            orderinfo['price'] *= 1;

            bidinfo['order_info'] = orderinfo;

            bidinfo['status'] = orderinfo['state'];
            statics['current_price'] = current_price;
            statics['sum_amount'] += orderinfo['volume'];
            statics['sum_amount_done'] += orderinfo['executed_volume'];
            statics['sum_amount_wait'] += orderinfo['remaining_volume'];
            statics['sum_bid_KRW'] += orderinfo['executed_volume']*orderinfo['price'];
            statics['sum_bid_KRW_withfee'] = statics['sum_bid_KRW'] * (1 + tradefee);
            statics['sum_rest_KRW'] += orderinfo['remaining_volume']*orderinfo['price'];
            statics['sum_invest_KRW'] += orderinfo['volume']*orderinfo['price'];
            statics['sum_invest_KRW_withfee'] = statics['sum_invest_KRW'] * (1 + tradefee);
        }
        total_invest_KRW[market][marketID] += statics['sum_invest_KRW_withfee'];
        statics['sum_amount_done_ratio'] = statics['sum_amount_done'] / statics['sum_amount'];
        statics['average'] = statics['sum_bid_KRW'] / statics['sum_amount_done'];  // 미체결시 NaN으로 표시됨.
        statics['average_withfee'] = statics['sum_bid_KRW_withfee'] / statics['sum_amount_done'];
        statics['cur_eval_net_ratio'] = (current_price - statics['average_withfee']) / statics['average_withfee'];
        statics['cur_eval_net_KRW'] = statics['cur_eval_net_ratio'] * statics['sum_invest_KRW_withfee'];
        slots[i]['statics'] = statics;
    }
    //console.log("#####################[Static Information]######################################");
    //console.log("Statics[", market, "][", marketID, "] = ", JSON.stringify(portfolio_info));
    if(filesave_count >= filesave_period) { filesave_count = 0; Save_JSON_file(portfolio_info, "./output/portfoilio"); }
}



/*******************************************************************************************************/
//  Reverse Trader
/*******************************************************************************************************/
/*
  정해진 만큼 상승폭이 발생하면 신규 slot을 생성하여 가지고 있는 coin을 매도한다.
*/
async function create_new_ask_slot(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let last_bidask_price = portfolio_info[market][marketID]['last_bidask_info']['tr_price'];
    let current_price = priceinfo['trade_price'];

    // reverse 모드일 경우 : Coin 가격이 오를경우 coin을 매도하여 현금을 매수한다. 현재 가격이 10000 이고 last_bidask_price가 9000일 경우 11% 상승 
    let gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1); // +1 to protect divid by zero

    // 최소 주문 Coin 수량은 최소 주문금액 500원으로 살 수 있는 수량이어야 함. 1.1을 곱하는 이유는 Margin을 확보하기 위함.
    config['minimum_order_coin'] = (config['minimum_order_KRW'] * 1.1) / current_price;  // (500 KRW * 1.1) / current price

    // config에 설정된 max slot 개수를 초과하게 되면 더이상 slot을 생성하지 않는다.
    if (slots.length >= config['max_slot_cnt']) { return; }

    // 첫번째 slot == 0 이고 last_bidask_price == 0 이면 즉시 slot을 생성해야 하기 때문에 gap_ratio Check를 하지 않고 현재가 기준 즉시 slot을 생성한다.
    if (slots.length > 0 || last_bidask_price > 0) // last_bidask_price가 0이 아니고 slots_length가 0 인 case는 slot을 모두 청산했을 경우에 발생한다.
    {
        if (slots.length == 0)
        {
            if (config['restart_flag'] == 0)
            {
                portfolio_info[market][marketID]['idle'] = true;
                //console.log("[N][", market, "][", marketID, "] Slot is Empty!! Auto Restart Flag is FALSE, go to Idle state!!");
                return;
            }
            else if (config['restart_flag'] == 1) // one shot mode
            {
                console.log("[N][", market, "][", marketID, "]*** Restart Trader with current price, make new first slot!!! ***");
                config['restart_flag'] = 0; // restart_flag를 0으로 초기화 안해주면 자동 auto start mode가 됨. 마지막 last bidask 값에서 정해놓은 % 하락시 재매수함.
                portfolio_info[market][marketID]['idle'] = false;
                Save_JSON_latest_file(config, "./output/" + config_filename[market][marketID]);
            }
            else
            {
                // auto repeat mode.....
                portfolio_info[market][marketID]['idle'] = false;
            } 
        }
        else
        {
            // 현재 Gap이 정해놓은 신규 slot 생성 조건보다 작으면 slot을 생성하지 않고 return 처리 한다.
            if ((gap_ratio < (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; } // 5% < 6% return, 7% >= 6% : create new ask slot.
        }
    }

    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_ask_info));
    let new_ask = JSON.parse(JSON.stringify(ask_info));
    let orderinfo = {};

    // slot is empty...
    if (slots.length == 0)
    {
        new_slot['type'] = "first";
        new_ask['amount'] = portfolio_info[market][marketID]['config']['slot_1st_Ask_Coin']; 
        new_ask['amount'] = new_ask['amount'] * 1;  
        new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
        //console.log("[", market, "][", marketID, "] Create New 1st Slots. Price = ", current_price);
        if (new_ask['amount'] >= config['limit_invest_coin']) { return; }
    }
    else // second/others slot creation condition.
    {
        new_slot['type'] = "others";
        new_ask['amount'] = portfolio_info[market][marketID]['config']['slot_2nd_Ask_Coin']; 
        new_ask['amount'] = new_ask['amount'] * 1;  
        new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
        //console.log("[", market, "][", marketID, "] Create additional Slots. Price = ", current_price, "Rising Gap = ", (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']));
        if ((sellcoin_count[market][marketID] + new_ask['amount']) >= config['limit_invest_coin'])
        {
            //console.log("(sellcoin_count[market][marketID] + orderinfo['volume']) >= limit_invest_coin");
            return;
        }
    }

    // Order Input (add ask)
    if(config['simulation'])
    {
        orderinfo['uuid'] = "ddddddddddd-dddddddd";
        orderinfo['state'] = "done";
        orderinfo['volume'] = new_ask['amount'];                            
        orderinfo['executed_volume'] = new_ask['amount'];   
        orderinfo['remaining_volume'] = 0;
        orderinfo['price'] = current_price; 
    }
    else
    {
        // 잔고 Check후 input order
        let SYM = market.split('-')[1];
        let balance = await upbit.get_chance(market);
        trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];

        if(balance['ask_account']['currency'] === SYM && balance['market']['id'] === market) // Coin을 매도해야 하기 때문에 ask_account를 체크함.
        {
            if (balance['ask_account']['balance'] >= new_ask['amount']) // Order Input (add ask)
            {
                if (config['real_test_mode'])
                {
                    orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit'); new_ask['amount'] = 1;
                }
                else
                {
                    orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                }
                console.log("[", market, "][", marketID, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", new_ask['amount']);
            }
            else if (balance['ask_account']['balance'] >= config['minimum_order_coin'])  // 잔고 부족시 system 최소 주문 금액보다 커야 주문을 낼 수 있다.
            {
                let org_ask = new_ask['amount'];
                new_ask['amount'] = balance['ask_account']['balance'];
                //new_ask['amount'] = new_ask['amount'] * (1 - tradefee);  // minus trade fee
                new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
                orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                console.log("[", market, "][", marketID, "] Insuffient Balance on your account!!! adjust input order amount!!");
                console.log("[", market, "][", marketID, "] Balance(Coin) = ", balance['ask_account']['balance'], " orgAsk = ", org_ask, " price = ", current_price, " input order amount = ", new_ask['amount']);
            }
            else { console.log("[", market, "][", marketID, "] **********Check Minimum Coin Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
        }
        else { console.log("[", market, "][", marketID, "] **********Check Coin Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
    }

    if("error" in orderinfo) 
    { 
        console.log ("[", market, "][", marketID, "] Input Order Error : Can't create new slot...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
        console.log ("[", market, "][", marketID, "] Message = ", orderinfo['error']['message']); 
        //new_slot['status'] = "suspending";
    }
    else 
    { 
        orderinfo['volume'] *= 1;
        orderinfo['executed_volume'] *= 1;
        orderinfo['remaining_volume'] *= 1;
        orderinfo['price'] *= 1;

        new_slot['timetick'] = current;
        new_slot['market'] = market;
        new_slot['marketID'] = marketID;
        new_slot['trends_prev'] = 0; // need to call MACD and check trends.
        new_slot['trends_create'] = 0; // need to call
        new_slot['trends_cur'] = 0; // need to call
        new_slot['status'] = "running";
        new_slot['increasecoin_orderinfo'] = 0;

        // bid information
        new_ask['invest_KRW'] = new_ask['amount'] * current_price; 
        new_ask['order_info'] = orderinfo;
        new_ask['deadline'] = new Date(Date.now() + expiredtime); 
        new_ask['price_info'] = priceinfo; 
        new_ask['status'] = orderinfo['state'];
        new_slot['add_ask'].push(new_ask);
        //console.log("[", market, "][", marketID, "] ################### New Slot - 1st Ask is added ################################");

        // check bid status : wait / done / 
        new_slot['last_bidask_info']['timetick'] = current;
        new_slot['last_bidask_info']['tr_price'] = current_price; 
        slots.push(JSON.parse(JSON.stringify(new_slot)));

        // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
        if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] == 0 
            || portfolio_info[market][marketID]['last_bidask_info']['tr_price'] < new_slot['last_bidask_info']['tr_price'])
        {
            //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", new_slot['last_bidask_info']['tr_price'])
            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = new_slot['last_bidask_info']['timetick'];
            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = new_slot['last_bidask_info']['tr_price'];
        } 
    }
}


/*
Reverse 물타기 함수 : 현재 slot 기준에서 last bid에서 config에 정의된 상승율을 초과할 경우 coin을 매도함. 매도 평단가 높이기 작업(물타기 반대개념).
*/
async function add_ask_to_slot(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    let i = 0, j = 0;
    for(i = 0; i < slots.length; i++)
    {
        let ask_sum = 0;
        let last_bidask_price = slots[i]['last_bidask_info']['tr_price'];
        let ask = slots[i]['add_ask'];

        for(j = 0; j < ask.length; j++)
        {
            ask_sum += ask[j]['amount'];
            ask_sum *= 1;
        }

        let gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1);

        if(ask.length >= config['max_addask_cnt']) 
        { 
            //console.log("[", market, "][", marketID, "][", i, "] ask.length(count) = ", ask.length, " j = ", j, " exceed max_addask_cnt[", config['max_addask_cnt'], "]" );
        }
        else
        {
            if(gap_ratio > (config['new_addask_Create_Ratio'] + config['new_addask_Create_Ratio_adj']))  // gap_ratio가 정해진 가격보다 상승폭이 크면 coin을 매도하여 KRW를 확보한다.
            {
                // Order Input (add ask)
                let orderinfo = {};
                let new_ask = JSON.parse(JSON.stringify(ask_info));

                if (config['simulation'])
                {
                    orderinfo['state'] = "done";
                    orderinfo['volume'] = ask_sum;
                    orderinfo['executed_volume'] = ask_sum;
                    orderinfo['remaining_volume'] = 0;
                    orderinfo['price'] = current_price; 
                    new_ask['amount'] = ask_sum;
                    if ((sellcoin_count[market][marketID] + new_ask['amount']) >= config['limit_invest_coin'])
                    {
                        //console.log("(sellcoin_count[market][marketID] + new_ask['amount']) >= limit_invest_coin");
                        return;
                    }
                }
                else
                {
                    // 잔고 Check후 input order
                    let SYM = market.split('-')[1];
                    let balance = await upbit.get_chance(market);

                    trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];
                    new_ask['amount'] = ask_sum.toFixed(6) * 1;

                    if ((sellcoin_count[market][marketID] + new_ask['amount']) >= config['limit_invest_coin'])
                    {
                        //console.log("(sellcoin_count[market][marketID] + new_ask['amount']) >= limit_invest_coin");
                        return;
                    }

                    if(balance['ask_account']['currency'] === SYM && balance['market']['id'] === market)
                    {
                        if (balance['ask_account']['balance'] >= new_ask['amount']) // Order Input (add ASK)
                        {
                            if (config['real_test_mode'])
                            {
                                orderinfo = await upbit.input_orders(market, 'ask', 2, current_price, 'limit'); new_ask['amount'] = 2;
                            }
                            else
                            {
                                orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                            }
                            //console.log("[", market, "][", marketID, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", new_ask['amount']);
                        }
                        else if (balance['ask_account']['balance'] >= config['minimum_order_coin'])  // system 최소 주문 금액보다 커야 주문을 낼 수 있다. 나머지 잔량 매도 처리함.
                        {
                            new_ask['amount'] = balance['ask_account']['balance'];
                            new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
                            orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                            console.log("[", market, "][", marketID, "] Insuffient Coin Balance on your account!!! adjust input order amount!!");
                            console.log("[", market, "][", marketID, "] Balance(Coin) = ", balance['ask_account']['balance'], " orgAsk_sum = ", org_ask_sum, " price = ", current_price, " input order amount = ", new_ask['amount']);
                        }
                        else { console.log("[", market, "][", marketID, "] **********Check Minimum Coin Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
                    }
                    else { console.log("[", market, "][", marketID, "] **********Check Coin Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
                }

                if("error" in orderinfo) 
                {
                    console.log ("[", market, "][", marketID, "] Input Order Error : Can't create new additional ask...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
                    console.log ("[", market, "][", marketID, "] Message = ", orderinfo['error']['message']); 
                }
                else
                {
                    orderinfo['volume'] *= 1;
                    orderinfo['executed_volume'] *= 1;
                    orderinfo['remaining_volume'] *= 1;
                    orderinfo['price'] *= 1;

                    // ask information
                    new_ask['order_info'] = orderinfo;
                    new_ask['deadline'] = new Date(Date.now() + expiredtime);
                    new_ask['price_info'] = priceinfo; 
                    new_ask['invest_KRW'] = new_ask['amount'] * current_price;
                    new_ask['status'] = orderinfo['state'];
                    slots[i]['add_ask'].push(new_ask);
                    //console.log("[", market, "][", marketID, "][", i, "][", j, "] Amount = ", new_ask['amount'], " ################### Additional Ask is added ################################");

                    // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
                    slots[i]['last_bidask_info']['timetick'] = current;
                    slots[i]['last_bidask_info']['tr_price'] = current_price;
                
                    if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > slots[i]['last_bidask_info']['tr_price'])
                    {
                        //console.log("Update Last Ask Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", slots[i]['last_bidask_info']['tr_price'])
                        portfolio_info[market][marketID]['last_bidask_info']['timetick'] = slots[i]['last_bidask_info']['timetick'];
                        portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = slots[i]['last_bidask_info']['tr_price'];
                    } 
                }
            } 
        }
    }
}



/*
통계 집계 : Reverse Mode에 대해서 현재 slot 단위로 관리되는 거래에 대한 통계를 작성 및 관리한다.
*/
async function update_Reverse_TrInfo_Statics(market, marketID, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    sellcoin_count[market][marketID] = 0;

    let i = 0, j = 0;
    for (i = 0; i < slots.length; i++)
    {
        // unit slot 
        let statics = JSON.parse(JSON.stringify(statics_ask_info));
        for (j = 0; j < slots[i]['add_ask'].length; j++) {
            let askinfo = slots[i]['add_ask'][j];
            let orderinfo = askinfo['order_info'];
            if (askinfo['status'] !== "done")
            {
                let uuid = askinfo['order_info']['uuid'];
                orderinfo = await upbit.get_orderinfo(uuid);
                if ("error" in orderinfo)
                {
                    console.log("[", market, "][", marketID, "][", i, "][", j, "] UUID = ", uuid, " [update_Reverse_TrInfo_Statics] ERROR Get Order info ################################");
                    continue; //break;  // TBT (to be tested)
                }
            }

            orderinfo['volume'] *= 1;
            orderinfo['executed_volume'] *= 1;
            orderinfo['remaining_volume'] *= 1;
            orderinfo['price'] *= 1;

            askinfo['order_info'] = orderinfo;
            askinfo['status'] = orderinfo['state'];
            statics['current_price'] = current_price;
            statics['sum_amount'] += orderinfo['volume']; // 매도 주문 코인 수량
            statics['sum_amount_done'] += orderinfo['executed_volume']; // 매도 주문 코인 중 매도체결된 수량
            statics['sum_amount_wait'] += orderinfo['remaining_volume'];    // 매도 주문 코인 중 미체결된 수량
            statics['sum_ask_KRW'] += orderinfo['executed_volume'] * orderinfo['price'];    // 매도된 코인이 체결되어 매입된 원화 금액
            statics['sum_ask_KRW_withfee'] = statics['sum_ask_KRW'] * (1 - tradefee);    // 매도된 코인이 체결되어 매입된 원화 금액 (수수료 포함, 수수료는 차감해서 들어온다.)
            statics['sum_rest_KRW'] += orderinfo['remaining_volume'] * orderinfo['price'];  // 매도되지 않은 코인 - 매입 예정인 원화 금액
            statics['sum_reclaim_KRW'] += orderinfo['volume'] * orderinfo['price'];  // 매도 주문된 코인의 원화 환산 금액 (매입하고자 하는 원화 총액)
            statics['sum_reclaim_KRW_withfee'] = statics['sum_reclaim_KRW'] * (1 - tradefee);
        }
        sellcoin_count[market][marketID] += statics['sum_amount_done'];
        statics['sum_amount_done_ratio'] = statics['sum_amount_done'] / statics['sum_amount'];  // 체결비율
        statics['average'] = statics['sum_ask_KRW'] / statics['sum_amount_done']; // 평균 매도 가격 - 미체결시 NaN으로 표시됨.
        statics['average_withfee'] = statics['sum_ask_KRW_withfee'] / statics['sum_amount_done']; // 평균 매도 가격 -  미체결시 NaN으로 표시됨.

        //  reverse에서는 계산하는 의미가 없음.. 결과론 적으로 coin의 개수가 늘어야 함.
        statics['cur_eval_net_ratio'] = (statics['average_withfee'] - current_price) / statics['average_withfee'];  // 이익 비율 - 미체결시 NaN으로 표시됨.
        statics['cur_eval_net_Coin'] = (statics['cur_eval_net_ratio'] * statics['sum_reclaim_KRW_withfee']) / current_price;    // 이익 코인 수 (증가량)
        slots[i]['statics'] = statics;
    }
    //console.log("#####################[Static Information]######################################");
    //console.log("Statics[", market, "][", marketID, "] = ", JSON.stringify(portfolio_info));
    if (filesave_count >= filesave_period) { filesave_count = 0; Save_JSON_file(portfolio_info, "./output/portfoilio"); }
}



/*
Coin 늘리기 함수 : 현재 slot 단위로 config에 정의된 target rate보다 큰 하락이 발생할 경우 coin을 매도했던 금액으로 Coin을 추매하여 Coin 보유량을 늘린다. 
*/
async function bid_sellKRW_buyCoin(market, marketID, current, priceinfo)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    for(i = 0; i < slots.length; i++)
    {
        let cur_slot_statics = slots[i]['statics'];
        let average = cur_slot_statics['average_withfee'];
        let cur_eval_net_Coin = cur_slot_statics['cur_eval_net_Coin'];
        let sum_amount_done = cur_slot_statics['sum_amount_done'];

        let target = config['target_bid_rate'] + config['target_bid_rate_adj'];  // Coin을 다시 사기위한 현재가격 대비 하락폭 설정
        let cur_eval_net_ratio = cur_slot_statics['cur_eval_net_ratio'];
        let sum_reclaim_KRW = cur_slot_statics['sum_reclaim_KRW_withfee'];
        let order_coin_count = sum_reclaim_KRW / current_price;
        order_coin_count = order_coin_count * (1 - tradefee);
        order_coin_count = order_coin_count.toFixed(6) * 1;

        if((cur_eval_net_ratio*100) > target) 
        {
            //console.log("################### Increase Coin ######################")
            //console.log("[", market, "][", marketID, "][slots", i, "] Target = ", target, " Current Eval net Ratio = ", (cur_eval_net_ratio*100), "%"); 
            //console.log("[", market, "][", marketID, "][slots", i, "] Buy Coin Price = ", current_price, " Amount = ", order_coin_count); 
            //console.log("[", market, "][", marketID, "][slots", i, "] sum_reclaim_KRW = ", sum_reclaim_KRW, " Sum of Net Profit(Coin, 이익) = ", cur_eval_net_Coin); 

            let orderinfo = { };
            if(config['simulation'])
            {
                orderinfo['state'] = "done";
                orderinfo['volume'] = order_coin_count;
                orderinfo['executed_volume'] = order_coin_count;
                orderinfo['remaining_volume'] = 0;
                orderinfo['price'] = current_price; 
                //console.log("[", market, "][", marketID, "][slots", i, "] price = ", current_price, " input order amount = ", orderinfo['volume'], " sum_reclaim_KRW = ", sum_reclaim_KRW);
                slots[i]['status'] = "increase_coin"; // ask is completed
                slots[i]['increasecoin_orderinfo'] = orderinfo;

                let increaseData = slots[i];
                increaseData['config'] = config;
                increasecoin_DB[market][marketID].push(increaseData);
                slots.splice(i, 1);

                // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                if (i == 0) // Slots이 모두 청산되었을 경우
                {
                    portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                    portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                }
            }
            else
            {
                // 잔고 Check후 input order
                let SYM = market.split('-')[0];
                let balance = await upbit.get_chance(market);
                let order_money = sum_reclaim_KRW;

                trade_fee[market]['bid_fee'] = balance['bid_fee'], trade_fee[market]['ask_fee'] = balance['ask_fee'];

                if (balance['bid_account']['currency'] === SYM && balance['market']['id'] === market)  // Coin을 매입을 해야 하기 때문에 bid_account (KRW)를 체크함.
                {
                    if (balance['bid_account']['balance'] >= order_money) // Order Input (add ask)
                    {
                        orderinfo = await upbit.input_orders(market, 'bid', order_coin_count, current_price, 'limit');

                        //console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", order_coin_count);
                        orderinfo['volume'] *= 1;
                        orderinfo['executed_volume'] *= 1;
                        orderinfo['remaining_volume'] *= 1;
                        orderinfo['price'] *= 1;
                        slots[i]['increasecoin_orderinfo'] = orderinfo;
                        slots[i]['status'] = "increase_coin"; // ask is completed

                        let increaseData = slots[i];
                        increaseData['config'] = config;
                        increasecoin_DB[market][marketID].push(increaseData);
                        slots.splice(i, 1);

                        // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                        if (i == 0) // Slots이 모두 청산되었을 경우
                        {
                            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                        }
                    }
                    else
                    {
                        // 잔고 부족시 남은 잔고라도 익절을 할지.... 그냥 slot을 유지할지.....고민 필요함. 현재는 매수주문을 90%만큼만 하고 slot을 생성한다.
                        if (balance['bid_account']['balance'] >= (order_money * 0.9))
                        {
                            order_coin_count = order_coin_count * 0.9;
                            order_coin_count = order_coin_count.toFixed(6) * 1;
                            orderinfo = await upbit.input_orders(market, 'bid', order_coin_count, current_price, 'limit');
                            console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Input Order amount = 90% ");
                            console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", order_coin_count, " Order Money = ", order_money);

                            //console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", order_coin_count);
                            orderinfo['volume'] *= 1;
                            orderinfo['executed_volume'] *= 1;
                            orderinfo['remaining_volume'] *= 1;
                            orderinfo['price'] *= 1;
                            slots[i]['increasecoin_orderinfo'] = orderinfo;
                            slots[i]['status'] = "increase_coin"; // ask is completed

                            let increaseData = slots[i];
                            increaseData['config'] = config;
                            increasecoin_DB[market][marketID].push(increaseData);
                            slots.splice(i, 1);

                            // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                            if (i == 0) // Slots이 모두 청산되었을 경우
                            {
                                portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                                portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                            }
                        }
                        else
                        {
                            console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Please check your Coin Balance!!");
                            console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", order_coin_count, " Order Money = ", order_money);
                            console.log("[", market, "][", marketID, "] portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price']);
                        }
                    }
                }
                else
                {
                    console.log("[", market, "][", marketID, "][slots", i, "] **********Check Balance ERROR************"); orderinfo = { 'error': { 'message': "User define error" } }
                }
            }
        }
    }
}


/*******************************************************************************************************/
//  Common Function
/*******************************************************************************************************/

/*
cancel old ask/bid order : 채결되지 않은 거래 중 expiredtime을 초과한 거래는 cancel 처리 한다.
*/
async function cancel_oldorders(market, marketID, current)
{
    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let mode = config['trade_mode'];
    let askbid = 0

    for (let i = 0; i < slots.length; i++)
    {
        if (mode === 'normal') { askbid = slots[i]['add_bid']; } else { askbid = slots[i]['add_ask']; }

        for (let j = 0; j < askbid.length; j++) {
            let askbidinfo = askbid[j];
            let deadline = askbidinfo['deadline'];
            let orderinfo = askbidinfo['order_info'];
            if (orderinfo['state'] !== "done" && (current - deadline) >= 0) // expired
            {
                let cancel_uuid = orderinfo['uuid'];
                let cancel = { canceltime: current, cancle_uuid: cancel_uuid };
                if (config['simulation'])
                {
                }
                else
                {
                    upbit.cancel_orders(cancel_uuid);   // need to do exception handling
                }
                cancel_orderlist[market][marketID].push(cancel);
                console.log("[", market, "][", marketID, "] Cancel time = ", current, " Cancel uuid = ", cancel_uuid)
            }
        }
    }
}


/*
 1/3/5/10/15/30/60/240 분봉 데이터를 이용하여 MACD 정보를 가공한다.
*/
async function get_MACD(market, TimeVal, min, signal, MACD)
{
    let db = [];
    let signalkey = "MACD_average" + String(signal);
    let MACDkey = "MACD_average" + String(MACD);
    let MACD_Shortkey = "MACD" + String(signal);
    let MACD_Longkey = "MACD" + String(MACD);
    let retry_cnt = 0;
    var data = 0;
    try {
        do {
            data = await upbit.getCandleData(market, TimeVal, min, 200);
            //console.log("data = ", data, "Retry getCandleData = ", retry_cnt)
        } while (("error" in data) && retry_cnt++ < 5);

        return new Promise(function (resolve, reject) {
            if ("error" in data) { resolve("error"); }

            // Calculate MACD Short Term Signal average 
            let i = 0; j = 0;
            for (i = 0; i <= data.length - signal; i++) {
                let sum = 0, average = 0;
                for (j = i; j < i + signal; j++) {
                    sum += data[j]['trade_price']
                }
                average = sum / signal;
                data[i][signalkey] = average;
            }

            //console.log("i-1 = ", i-1, "average = ", data[i-1][signalkey]);
            data[i - 1][MACD_Shortkey] = data[i - 1][signalkey];
            for (i = data.length - (signal + 1); i >= 0; i--) {
                data[i][MACD_Shortkey] = ((data[i]['trade_price'] * 2) / (signal + 1)) + (data[i + 1][MACD_Shortkey] * (1 - 2 / (signal + 1)));
            }

            // Calculate MACD Long Term Signal average 
            for (i = 0; i <= data.length - MACD; i++) {
                let sum = 0, average = 0;
                for (j = i; j < i + MACD; j++) {
                    sum += data[j]['trade_price']
                }
                average = sum / MACD;
                data[i][MACDkey] = average;
            }

            //console.log("i-1 = ", i-1, "average = ", data[i-1][MACDkey]);
            data[i - 1][MACD_Longkey] = data[i - 1][MACDkey];
            for (i = data.length - (MACD + 1); i >= 0; i--) {
                data[i][MACD_Longkey] = ((data[i]['trade_price'] * 2) / (MACD + 1)) + (data[i + 1][MACD_Longkey] * (1 - 2 / (MACD + 1)));
            }

            for (i = 0; i <= data.length - MACD; i++) {
                data[i]['Price_Diff'] = (data[i]['high_price'] - data[i]['low_price']) / data[i]['trade_price'];
                data[i]['MACD_GAP'] = data[i][MACD_Shortkey] - data[i][MACD_Longkey];
                data[i]['MACD_GAP_PriceRatio'] = data[i]['MACD_GAP'] / data[i]['trade_price'];
            }
            resolve(data);
        });
    }
    catch (error) {
        console.log("[ERROR] Fail to get candle data from server...")
    }
}


let static_previous = 0;

async function disiplay_statics(current, price_infoDB)
{

    let elapsed = (current - static_previous) / 1000;
    if (elapsed > 5)
    {
        static_previous = current;
        process.stdout.write('\033c');
        for (market in price_infoDB)
        {
            for (marketID in price_infoDB[market])
            {
                let slots = portfolio_info[market][marketID]['slots'];
                let config = portfolio_info[market][marketID]['config'];
                let mode = config['trade_mode'];
                let sum_org_KRW = 0;
                let sum_net_KRW = 0;
                let sum_org_coin = 0;
                let sum_net_coin = 0;
                let average = 0;
                let cur_price = price_infoDB[market][marketID]['trade_price'];
                let last_bidask_price = portfolio_info[market][marketID]['last_bidask_info']['tr_price'];
                let gap_ratio = (cur_price - last_bidask_price) * 100 / (last_bidask_price + 1)
                gap_ratio = gap_ratio.toFixed(2) * 1;

                console.log("*************************************** Current Running Slots Information ***********************************************************");
                console.log("=====================================================================================================================================");
                if (mode === 'normal')
                {
                    console.log("[N][", market, "][", marketID, "][", config_filename[market][marketID], "], [Period] = ", config['check_period'], ", [Control Status] = ", config['control_mode'], ", [real_test_mode] = ", config['real_test_mode']);
                    //console.log("[N][", market, "][", marketID, "][Control Status] = ", config['control_mode'], ", [real_test_mode] = ", config['real_test_mode']);
                    console.log("[N][", market, "][", marketID, "][Max 투입제한 금액] = ", config['limit_invest_KRW'], ", [1st 투입금액] = ", config['slot_1st_Bid_KRW'], ", [2nd 이후 투입금액] = ", config['slot_2nd_Bid_KRW']);
                    console.log("[N][", market, "][", marketID, "][max_slot_cnt] = ", config['max_slot_cnt'], ", [max_addbid_cnt] = ", config['max_addbid_cnt'], ", [익절 Rate] = ", config['target_ask_rate'] + config['target_ask_rate_adj']);
                    //console.log("[N][", market, "][", marketID, "][익절 Rate] = ", config['target_ask_rate'] + config['target_ask_rate_adj']);
                    console.log("[N][", market, "][", marketID, "][신규 Slot 생성 Rate] = ", config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj'], ", [Add Bid(물타기) Rate] = ", config['new_addbid_Create_Ratio'] + config['new_addbid_Create_Ratio_adj']);
                    //console.log("[N][", market, "][", marketID, "][Add Bid(물타기) Rate] = ", config['new_addbid_Create_Ratio'] + config['new_addbid_Create_Ratio_adj']);
                    console.log("=====================================================================================================================================");
                    console.log("[N][", market, "][", marketID, "] Idle = ", portfolio_info[market][marketID]['idle'], ", 현재 Coin 가격 = ", cur_price, ", Last Trade Price = ", last_bidask_price, ", Gap Ratio = ", gap_ratio, "%");
                }
                else
                {
                    console.log("[R][", market, "][", marketID, "][", config_filename[market][marketID], "], [Period] = ", config['check_period'], ", [Control Status] = ", config['control_mode'], ", [real_test_mode] = ", config['real_test_mode']);
                    //console.log("[R][", market, "][", marketID, "][Control Status] = ", config['control_mode'], ", [real_test_mode] = ", config['real_test_mode']);
                    console.log("[R][", market, "][", marketID, "][Max 매도제한 Coin 개수] = ", config['limit_invest_coin'], ", [1st 매도 Coin 개수] = ", config['slot_1st_Ask_Coin'], " [2nd 이후 매도 Coin 개수] = ", config['slot_2nd_Ask_Coin']);
                    console.log("[R][", market, "][", marketID, "][max_slot_cnt] = ", config['max_slot_cnt'], ", [max_addask_cnt] = ", config['max_addask_cnt'], ", [Coin 재매수 Rate] = ", config['target_bid_rate'] + config['target_bid_rate_adj']);
                    //console.log("[R][", market, "][", marketID, "][Coin 재매수 Rate] = ", config['target_bid_rate'] + config['target_bid_rate_adj']);
                    console.log("[R][", market, "][", marketID, "][신규 Slot 생성 Rate - 이전 slot 대비 상승율] = ", config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj'], " [Add Ask(Coin 고점팔기) Rate] = ", config['new_addask_Create_Ratio'] + config['new_addask_Create_Ratio_adj']);
                    //console.log("[R][", market, "][", marketID, "][Add Ask(Coin 고점팔기) Rate] = ", config['new_addask_Create_Ratio'] + config['new_addask_Create_Ratio_adj']);
                    console.log("=====================================================================================================================================");
                    console.log("[R][", market, "][", marketID, "] Idle = ", portfolio_info[market][marketID]['idle'], ", 현재 Coin 가격 = ", cur_price, ", Last Trade Price = ", last_bidask_price, ", Gap Ratio = ", gap_ratio, "%");
                }
                console.log("=====================================================================================================================================");

                for (let i = 0; i < slots.length; i++)
                {
                    let statics = slots[i]['statics'];
                    if (mode === 'normal')
                    {
                        console.log("[N][", market, "][", marketID, "][ Slot", i, "][ Bid", slots[i]['add_bid'].length, "] 현재 Coin 가격 =", statics['current_price'],
                            ", 매수 평단가 = ", statics['average_withfee'].toFixed(2), ", 매수 Coin 수량 = ", statics['sum_amount_done'].toFixed(2), ", 이익율 = ",
                            statics['cur_eval_net_ratio'].toFixed(2), "%" , ", 이익금액(KRW) = ", statics['cur_eval_net_KRW'].toFixed(2));
                        sum_org_KRW += statics['sum_invest_KRW_withfee'];
                        sum_net_KRW += statics['cur_eval_net_KRW'];
                        sum_org_coin += statics['sum_amount_done'];
                    }
                    else
                    {
                        console.log("[R][", market, "][", marketID, "][ Slot", i, "][ Ask", slots[i]['add_ask'].length, "] 현재 Coin 가격 =", statics['current_price'],
                            ", 매도 평단가 = ", statics['average_withfee'].toFixed(2), ", 매도 Coin 수량 = ", statics['sum_amount_done'], ", 회수된 원화(KRW) 금액 = ",
                            statics['sum_ask_KRW_withfee'].toFixed(2), ", 이익율 = ", statics['cur_eval_net_ratio'].toFixed(2), "%", ", Coin 증가 = ", statics['cur_eval_net_Coin'].toFixed(2));
                        sum_org_KRW += statics['sum_ask_KRW_withfee'];
                        sum_org_coin += statics['sum_amount_done'];
                        sum_net_coin += statics['cur_eval_net_Coin'];
                    }
                }
                console.log("=====================================================================================================================================");
                if (mode === 'normal')
                {
                    let net_KRW_ratio = (sum_net_KRW / (sum_org_KRW + 0.000001)) * 100;
                    net_KRW_ratio = net_KRW_ratio.toFixed(2);
                    average = sum_org_KRW / (sum_org_coin + 0.000001);
                    average = average.toFixed(1) * 1;
                    sum_org_coin = sum_org_coin.toFixed(2) * 1;
                    console.log("[N][", market, "][", marketID, "] 투입금액 = ", sum_org_KRW.toFixed(2), ", 매입 Coin = ", sum_org_coin, ", 매입 평단가 = ", average, ", 손익(KRW) = ", sum_net_KRW.toFixed(2), ", 원화 이익율 = ", net_KRW_ratio, "%");
                    console.log("=====================================================================================================================================");
                    console.log("\n")
                }
                else
                {
                    let net_Coin_ratio = (sum_net_coin / (sum_org_coin + 0.000001)) * 100;
                    net_Coin_ratio = net_Coin_ratio.toFixed(2);
                    average = sum_org_KRW / (sum_org_coin + 0.000001);
                    average = average.toFixed(2) * 1;
                    console.log("[R][", market, "][", marketID, "] Coin 매도수량 = ", sum_org_coin.toFixed(2), ", 매도 평단가 = ", average, ", Coin 손익 = ", sum_net_coin.toFixed(2), ", Coin 이익율 = ", net_Coin_ratio, "%");
                    console.log("=====================================================================================================================================");
                    console.log("\n")
                }
            }
        }

        for (market in price_infoDB)
        {
            let sum_org_KRW = 0;
            let sum_net_KRW = 0;
            for (marketID in price_infoDB[market])
            {
                if (portfolio_info[market][marketID]['config']['trade_mode'] !== "normal") { continue; }
                let liquid_history = liquidation_DB[market][marketID];
                console.log("***************************************** Liquidation   History(", liquid_history.length, ") **************************************************************** ")

                for (let i = 0; i < liquid_history.length; i++)
                {
                    let statics = liquid_history[i]['statics'];
                    let orderinfo = liquid_history[i]['liquidation_orderinfo'];
                    sum_org_KRW += statics['sum_invest_KRW_withfee'];
                    sum_net_KRW += statics['cur_eval_net_KRW'];
                    if (i <
                        5)
                    {
                        console.log("[N][", market, "][", marketID, "][ Slot", i, "] 현재 Coin 가격 =", statics['current_price'],
                            " 매수 평단가 = ", statics['average_withfee'].toFixed(2), ", Coin 잔고 = ", statics['sum_amount_done'].toFixed(2), ", 이익율 = ",
                            statics['cur_eval_net_ratio'].toFixed(2), "%, 이익금액(KRW) = ", statics['cur_eval_net_KRW'].toFixed(2));
                    }
                }
                let cur_total_KRW = sum_org_KRW + sum_net_KRW;
                let net_ratio = (sum_net_KRW / (sum_org_KRW+0.000001)) * 100;
                net_ratio = net_ratio.toFixed(2);
                cur_total_KRW = cur_total_KRW.toFixed(2) * 1;
                console.log("=====================================================================================================================================");
                console.log("[", market, "][", marketID, "] 총 투자금액(KRW) = ", sum_org_KRW.toFixed(2), ", 현 평가 금액(KRW) = ", cur_total_KRW,
                    ", 이익금액(KRW) = ", sum_net_KRW.toFixed(2), ", 원화 이익율 = ", net_ratio, "%");
                console.log("=====================================================================================================================================");
                console.log("\n")
            }
        }

        for (market in price_infoDB)
        {
            let sum_org_coin = 0;
            let sum_net_coin = 0;
            for (marketID in price_infoDB[market])
            {
                if (portfolio_info[market][marketID]['config']['trade_mode'] !== "reverse") { continue; }
                let increasecoin_history = increasecoin_DB[market][marketID];
                console.log("***************************************** Increase Coin History(", increasecoin_history.length, ") **************************************************************** ");

                for (let i = 0; i < increasecoin_history.length; i++)
                {
                    let statics = increasecoin_history[i]['statics'];
                    let orderinfo = increasecoin_history[i]['increasecoin_orderinfo'];
                    sum_org_coin += statics['sum_amount_done'];
                    sum_net_coin += statics['cur_eval_net_Coin'];

                    if (i < 5)
                    {
                        console.log("[R][", market, "][", marketID, "][ Slot", i, "] Coin 매도평단가 = ", statics['average_withfee'].toFixed(2), ", 매도 Coin 수량 = ", 
                            statics['sum_amount_done'], ", 회수금액(KRW) = ", statics['sum_ask_KRW_withfee'].toFixed(2), ", 재매수 가격 = ", statics['current_price'],
                            ", 이익율 = ", statics['cur_eval_net_ratio'].toFixed(2), "%,  Coin 증가개수 = ", statics['cur_eval_net_Coin'].toFixed(2));
                    }
                }
                let cur_total_coin = sum_org_coin + sum_net_coin;
                let net_ratio = (sum_net_coin / (sum_org_coin+0.000001)) * 100;
                net_ratio = net_ratio.toFixed(2);
                cur_total_coin = cur_total_coin.toFixed(2) * 1;
                console.log("=====================================================================================================================================");
                console.log("[", market, "][", marketID, "] 매도 Coin 합계 = ", sum_org_coin.toFixed(2), ", 재매수 Coin 합계 = ", cur_total_coin,
                    ", Coin 증가 = ", sum_net_coin.toFixed(2), ", 이익율 = ", net_ratio, "%");
                console.log("=====================================================================================================================================");
                console.log("\n")
            }
        }
    }
}



/*
  Save_JSON_file : 전달된 JSON객체를 filename(Path정보 포함)으로 저장한다.
*/
function Save_JSON_file(jsonObject, filename) {
    var json = JSON.stringify(jsonObject);
    filename = filename + "_" + suffix + ".json";
    fse.outputFileSync(filename, json, 'utf-8', function (e) {
        if (e) { console.log(e); } else { console.log("Download is done!"); }
    });
}

/*
  Save_JSON_file : 전달된 JSON객체를 filename(Path정보 포함)으로 저장한다.
*/
function Save_JSON_latest_file(jsonObject, filename) {
    var json = JSON.stringify(jsonObject);
    filename = filename + ".json";
    fse.outputFileSync(filename, json, 'utf-8', function (e) {
        if (e) { console.log(e); } else { console.log("Download is done!"); }
    });
}



/*
  Load JSON File : filename(Path정보 포함)을 읽어 initiative_DB 객체(JSON)으로 Loading한다.
*/
function Load_JsonDB(filename)
{
    //filename = filename + "_" + suffix + ".json";
    filename = filename + ".json";

    return new Promise(function (resolve, reject)
    {
        fs.exists(filename, (exist) =>
        {
            if (exist)
            {
                let config = fs.readFileSync(filename, 'utf8');
                resolve(JSON.parse(config));
            }
            else
            {
                console.log("Can't find ", filename, " config file, use default settings"); resolve(portfolio_info[market][marketID]['config']);
            }  // file read 실패시 기존값 return함.
        });
    });
}


smart_coin_trader();

module.exports = 
{ 
};
