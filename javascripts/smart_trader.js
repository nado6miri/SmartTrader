//const sleep = require('sleep');
const fse = require('fs-extra');
var moment = require('moment-timezone')

const upbit = require("./upbit_restapi");

const tradefee = 0.0005;
const expiredtime = 1*24*60*60*1000; // 24Hours
const simulation = true;
//const simulation = false;
const algorithm_test = true;
var filesave_count = 0;
const filesave_period = 12; // check_period * count = 5sec * 12 = 60sec
var expired_chk_count = 0;
const expired_chk_period = 12; // check_period * count = 5sec * 12 = 60sec
var CtrlPrint = { };

var sellcoin_count = {}; // reverse mode에서 현재까지 매도된 coin 수량
var total_invest_KRW = {}; // normal mode에서 현재까지 매수/투자된 KRW 합
const trade_fee = {}; // { MARKET : { ASK : 0.05, BID : 0.05 } }

// normal mode
var config_bid_param = {
    trade_mode : 'normal',
    max_slot_cnt : 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Bid_KRW : 5000,   //* fisrt investment moeny (unit : KRW)
    slot_2nd_Bid_KRW : 10000,  //* after 1st slot, investment moeny (unit : KRW)
    check_period : 1,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt : 5,              //* set retry count when restapi fails 
    target_ask_rate : 5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj : 1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio : -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj : 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio : -5,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj : 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    max_addbid_cnt : 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay : 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_coin : 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW : 1000000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW : 500,
    minimum_order_coin : 0.1,    // KRW 500 / Current price = minimum_order_coin
}

// reverse mode
var config_ask_param = {
    trade_mode : 'reverse',
    max_slot_cnt : 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Ask_Coin : 1,   //* fisrt investment coint (unit : EA)
    slot_2nd_Ask_Coin : 2,  //* after 1st slot, investment coin (unit : EA)
    check_period : 1,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt : 5,              //* set retry count when restapi fails 
    target_bid_rate : 5,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj : 1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio : 3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj : 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio : 5,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj : 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    max_addask_cnt : 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay : 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_coin : 200000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW : 0000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW : 500,
    minimum_order_coin : 0.1,    // KRW 500 / Current price = minimum_order_coin
}

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
    cur_eval_net_KRW : 0, //'cur_eval_net_ratio*sum_bidkw',
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

var portfolio = { config : { }, last_bidask_info : { timetick : 0, tr_price : 0 }, slots : [] }; // slot config & info......
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
var portpolio_list = { 
    'KRW-EOS_ID1': config_bid_param, 
    'KRW-EOS_ID2': config_ask_param, 
    /*
    'KRW-ETH_ID2' : config_bid_param, 
    'KRW-BCH_ID3' : config_bid_param, 
    'KRW-XRP_ID4' : config_bid_param, 
    'KRW-BTC_ID5' : config_bid_param, 
    */
};

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

getPrice['KRW-EOS']['ID1'] = price_generator(600, 10000, 50, 10000, false); // Generator
getPrice['KRW-EOS']['ID2'] = price_generator(1000, 3300, 10, 1000, true); // Generator
getPrice['KRW-ETH']['ID2'] = price_generator(100000, 200000, 50, 200000, false); // Generator
getPrice['KRW-BCH']['ID3'] = price_generator(100000, 330000, 50, 330000, false); // Generator
getPrice['KRW-XRP']['ID4'] = price_generator(100, 500, 1, 500, false); // Generator
getPrice['KRW-BTC']['ID5'] = price_generator(3000000, 7000000, 5000, 3000000, true); // Generator


/*
전체 계좌 조회 : 보유 원화, 토큰에 대한 잔고 및 lock 수량, 평단가 제공.
*/
async function smart_coin_trader()
{
    let current = 0;
    let previous = {};
    let elapsed = {};
    let retry_cnt = 0;

    for (key in portpolio_list)
    {
        let market, marketID;
        market = marketID = key;
        marketID = marketID.split('_')[1];
        market = market.split('_')[0];
        
        let pfolio = JSON.parse(JSON.stringify(portfolio));
        pfolio['config'] = JSON.parse(JSON.stringify(portpolio_list[key]));  // todo : portfolio에 편입된 marketID별 config를 설정해야 함.
        pfolio['slots'] = []; 
        
        if(portfolio_info.hasOwnProperty(market) === false) { portfolio_info[market] = { }; }
        portfolio_info[market][marketID] = JSON.parse(JSON.stringify(pfolio));
        
        if(liquidation_DB.hasOwnProperty(market) === false) { liquidation_DB[market] = {}; }
        if(liquidation_DB[market].hasOwnProperty(marketID) === false) { liquidation_DB[market][marketID] = []; }

        if (increasecoin_DB.hasOwnProperty(market) === false) { increasecoin_DB[market] = {}; }
        if (increasecoin_DB[market].hasOwnProperty(marketID) === false) { increasecoin_DB[market][marketID] = []; }

        if (total_invest_KRW.hasOwnProperty(market) === false) { total_invest_KRW[market] = {}; }
        if (total_invest_KRW[market].hasOwnProperty(marketID) === false) { total_invest_KRW[market][marketID] = 0; }

        if (sellcoin_count.hasOwnProperty(market) === false) { sellcoin_count[market] = {}; }
        if (sellcoin_count[market].hasOwnProperty(marketID) === false) { sellcoin_count[market][marketID] = 0; }
    }
    console.log("portfolio_info = ", JSON.stringify(portfolio_info));
    console.log("liquidation_DB = ", JSON.stringify(liquidation_DB));
    console.log("increasecoin_DB = ", JSON.stringify(increasecoin_DB));

    // 2. make MACD Information.
    const MACD_Period = 1000*60*1; // 2min
    for(pfkey in portpolio_list)
    {
        let market, marketID;
        market = marketID = pfkey;
        market = market.split('_')[0];
        marketID = marketID.split('_')[1];

        timerID_info[market] = JSON.parse(JSON.stringify(timerID));
        for(key in timerID_info[market])
        {
            let data = [];
            let timeval = "MIN";
            if(key === "days") { timeval = "DAY"; } else if(key === "weeks") { timeval = "WEEK"; } else { timeval = "MIN"; }

            console.log("start timer : key = ", key, " market = ", market, "time = ", timerID_Minval[key], timerID_info[market][key]);
            if(timerID_info[market][key] === 0)
            {
                data = await get_MACD(market, timeval, timerID_Minval[key], 9, 26);
                if(data.length > 0 && (data != "error")) 
                { 
                    if(MACD_info.hasOwnProperty(market) === false) { MACD_info[market] = {}; }
                    MACD_info[market][key] = data; 
                }
                data = []; 
                //console.log("First Init ==> MACD_info[", market, "][", key, "] MACD_info = ", JSON.stringify(MACD_info[market][key]));
            }

            // create timer
            timerID_info[market][key] = setInterval(async function () {
                data = await get_MACD(market, timeval, timerID_Minval[key], 9, 26);
                if(data.length > 0 && (data != "error")) { MACD_info[market][key] = data; } 
                //console.log("MACD_info[", market, "][", key, "] MACD_info = ", JSON.stringify(MACD_info[market][key]));
                //Save_JSON_file(MACD_info, "macd_infomation.json");
            }, timerID_Minval[key]*MACD_Period); 
            //console.log("TimerID_info[", market, "][", key, "] = ", timerID_info[market][key]);
        }
    }

    // 3. create the first slot
    while(1)
    {
        current = new Date();

        for(market in portfolio_info)
        {
            if(CtrlPrint.hasOwnProperty(market) === false) { CtrlPrint[market] = { }; }
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
                if(CtrlPrint[market].hasOwnProperty(marketID) === false) { CtrlPrint[market][marketID] = { }; }
                /*
                if(algorithm_test)
                {
                    if(getPrice.hasOwnProperty(market) === false) { getPrice[market] = { }; }
                    if(getPrice[market].hasOwnProperty(marketID) === false) { getPrice[market][marketID] = price_generator(10, 10000, 10); } // Generator 
                }
                */
                CtrlPrint[market][marketID]['cr_bid_slot'] = false;
                CtrlPrint[market][marketID]['cr_ask_slot'] = false;
                CtrlPrint[market][marketID]['addbid'] = false;
                CtrlPrint[market][marketID]['addask'] = false;
                CtrlPrint[market][marketID]['liquid'] = false;
                CtrlPrint[market][marketID]['increasecoin'] = false;
                CtrlPrint[market][marketID]['cancel_uuid'] = false;
                if(previous[market].hasOwnProperty(marketID) === false) { previous[market][marketID] = 0; }
                if(elapsed[market].hasOwnProperty(marketID) === false) { elapsed[market][marketID] = 0; }

                elapsed[market][marketID] = (current - previous[market][marketID])/1000;

                if (elapsed[market][marketID] > portfolio_info[market][marketID]['config']['check_period'])
                {
                    let priceinfo = { };
                    let tradeMode = portfolio_info[market][marketID]['config']['trade_mode'];
                    priceinfo[market] = { };
                    previous[market][marketID] = current;
                    if(algorithm_test)
                    {
                        let cur_p = getPrice[market][marketID].next().value;
                        priceinfo[market]['trade_price'] = cur_p;
                        //console.log("[", market, "][", marketID, "] Current = ", current, " priceinfo = ", priceinfo[market]['trade_price']);
                    }
                    else
                    {
                        console.log("[", market, "] ", portfolio_info[market][marketID]['config']['check_period'], " sec priodic routine....");
                        let cur_price = await upbit.getCurrentPriceInfo(market);
                        priceinfo[market] = cur_price[0];
                        //console.log("[", market, "][Price] = ", JSON.stringify(priceinfo[market]), "\n");
                        //Save_JSON_file(priceinfo, "cur_price.json");
                    }

                    if(tradeMode === "normal")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        create_new_bid_slot(market, marketID, current, priceinfo[market]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                        add_bid_to_slot(market, marketID, current, priceinfo[market]); 

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        update_Normal_TrInfo_Statics(market, marketID, priceinfo[market]);

                        // 최종 정리된 DB 기준으로 수익율을 조사하고 수익이 났으면 청산한다.
                        // (마지막 하나 남은 slot이면 청산하지 않고 수익분만 청산하고 초기 투자 금액은 유지한다. 또는 청산하고 last bid price 기준 하락시 new slot을 생성한다. 우선 후자로 결정함.)
                        ask_sellCoin_buyKRW(market, marketID, current, priceinfo[market]);
                    }
                    else if(tradeMode === "reverse")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        create_new_ask_slot(market, marketID, current, priceinfo[market]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                        add_ask_to_slot(market, marketID, current, priceinfo[market]); 

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        update_Reverse_TrInfo_Statics(market, marketID, priceinfo[market]);

                        // 최종 정리된 DB 기준으로 수익율을 조사하고 수익이 났으면 청산한다.
                        // (마지막 하나 남은 slot이면 청산하지 않고 수익분만 청산하고 초기 투자 금액은 유지한다. 또는 청산하고 last bid price 기준 하락시 new slot을 생성한다. 우선 후자로 결정함.)
                        bid_sellKRW_buyCoin(market, marketID, current, priceinfo[market]);
                    }
                    else
                    {
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                        console.log("========= Configuration Error =============");
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                    }

                    // expired 된 거래에 대해 취소여부를 결정하고 취소/유지 처리를 한다. 
                    if (expired_chk_count >= expired_chk_period) { fexpired_chk_count = 0; cancel_oldorders(market, marketID, current); }
                    filesave_count++;
                    expired_chk_count++;
                }
            }
        }
        disiplay_statics(current);
    }
}

/*
  정해진 만큼 하락폭이 발생하면 신규 slot을 생성하여 가지고 현금으로 있는 coin을 매수한다.
*/
async function create_new_bid_slot(market, marketID, current, priceinfo)
{
    let slots_length = portfolio_info[market][marketID]['slots'].length;
    let config = portfolio_info[market][marketID]['config'];
    let last_bidask_price = portfolio_info[market][marketID]['last_bidask_info']['tr_price'];
    let current_price = priceinfo['trade_price'];
    // 하락장에서 last_bidask 가격이 10000 이고, 현재 가격이 9000 원이면 -10% 임.
    let gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1); // +1 to protect divid by zero

    config['minimum_order_coin'] = (config['minimum_order_KRW'] * 1.1) / current_price;  // (500 KRW * 1.1) / current price

    if(slots_length >= config['max_slot_cnt']) 
    {
        //console.log("[", market, "][", marketID, "] The number of slots exceed max_slot_cnt !!!, slots count = ", slots_length);
        //console.log(JSON.stringify(portfolio_info));
        return; 
    }

    if(slots_length > 0 && (gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; }

    if(slots_length === 0)
    {
        if(last_bidask_price === 0) // 1st slot creation operation
        {
        }
        else // all slots are liquidated, there is no slots --> need to create new 1st slot when cur_price *  < last_bidask_price)  
        {
            gap_ratio = (current_price - last_bidask_price)*100 / last_bidask_price;
            if((gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; } // -5% > -6% return, -7% <= -6% : create new slot.
        }
    }

    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_bid_info));
    let new_bid = JSON.parse(JSON.stringify(bid_info));

    // slot is empty...
    if(slots_length == 0)
    {
        //console.log("[", market, "][", marketID, "] Create New 1st Slots. Price = ", current_price);
        new_slot['type'] = "first";
        new_bid['amount'] = portfolio_info[market][marketID]['config']['slot_1st_Bid_KRW'] / current_price; //priceinfo['trade_price'];
        new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);
        new_bid['invest_KRW'] = portfolio_info[market][marketID]['config']['slot_1st_Bid_KRW'];
    }
    else // second/others slot creation condition.
    {
        //console.log("[", market, "][", marketID, "] Create additional Slots. Price = ", current_price, "Fall Gap = ", (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']));
        new_slot['type'] = "others";
        new_bid['amount'] = portfolio_info[market][marketID]['config']['slot_2nd_Bid_KRW'] / current_price; //priceinfo['trade_price'];
        new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);
        new_bid['invest_KRW'] = portfolio_info[market][marketID]['config']['slot_2nd_Bid_KRW'];
    }

    if ((total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config['limit_invest_KRW'])
    {
        //console.log("[Create New Slots] == (total_invest_KRW[market][marketID] + orderinfo['invest_KRW']) >= limit_invest_KRW");
        return;
    }

    // Order Input (add bid)
    let orderinfo = { };
    if(simulation)
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
                //orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = 1;
                //console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
            }
            else if (balance['bid_account']['balance'] >= config['minimum_order_KRW'])  // system 최소 주문 금액보다 커야 주문을 낼 수 있다.
            {
                let org_bid = new_bid['amount'];
                order_money = balance['bid_account']['balance'];
                new_bid['amount'] = order_money / current_price;
                new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee - 수수료 고려하여 주문할 수 있는 최대 코인을 주문한다.
                new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);
                //orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = 1;
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
        new_bid['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
        //new_bid['deadline'] = moment(current).add(24, 'Hour');
        new_bid['price_info'] = priceinfo; 
        new_bid['status'] = orderinfo['state'];
        new_slot['add_bid'].push(new_bid);
        CtrlPrint[market][marketID]['cr_bid_slot'] = true;
        //console.log("[", market, "][", marketID, "] ################### New Slot - 1st Bid is added ################################");

        // check bid status : wait / done / 
        new_slot['last_bidask_info']['timetick'] = current;
        new_slot['last_bidask_info']['tr_price'] = current_price; //priceinfo['trade_price'];
        portfolio_info[market][marketID]['slots'].push(JSON.parse(JSON.stringify(new_slot)));

        // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
        if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] == 0 
            || portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > new_slot['last_bidask_info']['tr_price'])
        {
            //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", new_slot['last_bidask_info']['tr_price'])
            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = new_slot['last_bidask_info']['timetick'];
            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = new_slot['last_bidask_info']['tr_price'];
        } 
        
        //if(CtrlPrint[market][marketID]['cr_bid_slot']) { console.log(JSON.stringify(portfolio_info)); }
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
            //last_bidask_price = bid[j]['price_info']['trade_price'];
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

                if (simulation)
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
                            //orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                            orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = bid_sum = 1;
                            //console.log("[", market, "][", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
                        }
                        else if (balance['bid_account']['balance'] >= config['minimum_order_KRW'])  // system 최소 주문 금액보다 커야 주문을 낼 수 있다.
                        {
                            order_money = balance['bid_account']['balance'];
                            let org_bid_sum = new_bid['amount'];
                            new_bid['amount'] = order_money / current_price;
                            new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee - 수수료 고려하여 주문할 수 있는 최대 코인을 주문한다.
                            new_bid['amount'] = 1 * new_bid['amount'].toFixed(6);

                            //orderinfo = await upbit.input_orders(market, 'bid', new_bid['amount'], current_price, 'limit');
                            orderinfo = await upbit.input_orders(market, 'bid', 1, current_price, 'limit'); new_bid['amount'] = bid_sum = 1;
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
                    // bid information
                    new_bid['order_info'] = orderinfo;
                    new_bid['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
                    //new_bid['deadline'] = moment(current).add(24, 'Hour');
                    new_bid['price_info'] = priceinfo; 
                    new_bid['amount'] = bid_sum;
                    new_bid['invest_KRW'] = bid_sum * current_price;
                    new_bid['status'] = orderinfo['state'];
                    slots[i]['add_bid'].push(new_bid);
                    CtrlPrint[market][marketID]['addbid'] = true;
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
                    //if(CtrlPrint[market][marketID]['addbid']) { console.log(JSON.stringify(portfolio_info)); }
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
            if(simulation)
            {
                orderinfo['state'] = "liquidation";
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
                CtrlPrint[market][marketID]['liquid'] = true;
                // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                if(i == 0) 
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
                        //orderinfo = await upbit.input_orders(market, 'ask', sum_amount_done, current_price, 'limit');
                        orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit');
                        //console.log("[", market, "][", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                        slots[i]['status'] = "liquidation"; // ask is completed
                        slots[i]['liquidation_orderinfo'] = orderinfo;
                        let liquidData = slots[i];
                        liquidData['config'] = config;
                        //liquidation_DB[market][marketID].push(slots[i]);
                        liquidation_DB[market][marketID].push(liquidData);
                        slots.splice(i, 1);
                        CtrlPrint[market][marketID]['liquid'] = true;
                        // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                        if(i == 0) 
                        { 
                            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                        }
                    }
                    else
                    {
                        // 잔고 부족시 남은 잔고라도 익절을 할지.... 그냥 slot을 유지할지.....고민 필요함. 우선 그냥 error message만 표시하고 유지하는 것으로 작성함.
                        //orderinfo = await upbit.input_orders(market, 'ask', balance['ask_account']['balance'], current_price, 'limit');
                        //orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit');
                        console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Please check your Coin Balance!!");
                        console.log("[", market, "][", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                    }
                }
                else { console.log("[", market, "][", marketID, "][slots", i, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
            }

            if(CtrlPrint[market][marketID]['liquid'])
            {
                //console.log("################### Liquidation ######################")
                //console.log(JSON.stringify(liquidation_DB));
                Save_JSON_file(liquidation_DB, "liquidation.json");
                //console.log("######################################################");
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
        statics['average'] = statics['sum_bid_KRW'] / statics['sum_amount_done'];
        statics['average_withfee'] = statics['sum_bid_KRW_withfee'] / statics['sum_amount_done'];
        statics['cur_eval_net_ratio'] = (current_price - statics['average_withfee']) / statics['average_withfee'];
        statics['cur_eval_net_KRW'] = statics['cur_eval_net_ratio'] * statics['sum_invest_KRW_withfee'];
        slots[i]['statics'] = statics;
    }
    //console.log("#####################[Static Information]######################################");
    //console.log("Statics[", market, "][", marketID, "] = ", JSON.stringify(portfolio_info));
    if(filesave_count >= filesave_period) { filesave_count = 0; Save_JSON_file(portfolio_info, "./portfoilio.json"); }
}



/*******************************************************************************************************/
//  Reverse Trader
/*******************************************************************************************************/
/*
  정해진 만큼 상승폭이 발생하면 신규 slot을 생성하여 가지고 있는 coin을 매도한다.
*/
async function create_new_ask_slot(market, marketID, current, priceinfo)
{
    let slots_length = portfolio_info[market][marketID]['slots'].length;
    let config = portfolio_info[market][marketID]['config'];
    let last_bidask_price = portfolio_info[market][marketID]['last_bidask_info']['tr_price'];
    let current_price = priceinfo['trade_price'];
    // reverse 모드일 경우 : 오를경우 coin을 매도하여 현금을 매수한다. 현재 가격이 10000 이고 last_bidask_price가 9000일 경우 11% 상승 
    let gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1); // +1 to protect divid by zero

    config['minimum_order_coin'] = (config['minimum_order_KRW'] * 1.1) / current_price;  // (500 KRW * 1.1) / current price

    if(slots_length >= config['max_slot_cnt']) 
    {
        //console.log("[", market, "][", marketID, "] The number of slots exceed max_slot_cnt !!!, slots count = ", slots_length);
        //console.log(JSON.stringify(portfolio_info));
        return; 
    }

    if(slots_length > 0 && (gap_ratio < (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; }

    if(slots_length === 0)
    {
        if(last_bidask_price === 0) // 1st slot creation operation
        {
        }
        else // all slots are liquidated, there is no slots --> need to create new 1st slot when cur_price *  < last_bidask_price)  
        {
            gap_ratio = (current_price - last_bidask_price)*100 / (last_bidask_price + 1);
            if((gap_ratio < (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; } // 5% < 6% return, 7% >= 6% : create new ask slot.
        }
    }

    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_ask_info));
    let new_ask = JSON.parse(JSON.stringify(ask_info));

    // slot is empty...
    if(slots_length == 0)
    {
        //console.log("[", market, "][", marketID, "] Create New 1st Slots. Price = ", current_price);
        new_slot['type'] = "first";
        new_ask['amount'] = portfolio_info[market][marketID]['config']['slot_1st_Ask_Coin']; 
        new_ask['amount'] = new_ask['amount'] * 1;  
        new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
        new_ask['invest_KRW'] = new_ask['amount'] * current_price; 
    }
    else // second/others slot creation condition.
    {
        //console.log("[", market, "][", marketID, "] Create additional Slots. Price = ", current_price, "Rising Gap = ", (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']));
        new_slot['type'] = "others";
        new_ask['amount'] = portfolio_info[market][marketID]['config']['slot_2nd_Ask_Coin']; 
        new_ask['amount'] = new_ask['amount'] * 1;  
        new_ask['amount'] = 1 * new_ask['amount'].toFixed(6);
        new_ask['invest_KRW'] = new_ask['amount'] * current_price; 
    }

    if ((sellcoin_count[market][marketID] + new_ask['amount']) >= config['limit_invest_coin'])
    {
        //console.log("(sellcoin_count[market][marketID] + orderinfo['volume']) >= limit_invest_coin");
        return;
    }

    // Order Input (add ask)
    let orderinfo = { };
    if(simulation)
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
                //orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit'); new_ask['amount'] = 1;
                //console.log("[", market, "][", marketID, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", new_ask['amount']);
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
        new_slot['timetick'] = current;
        new_slot['market'] = market;
        new_slot['marketID'] = marketID;
        new_slot['trends_prev'] = 0; // need to call MACD and check trends.
        new_slot['trends_create'] = 0; // need to call
        new_slot['trends_cur'] = 0;
        new_slot['status'] = "running";
        new_slot['increasecoin_orderinfo'] = 0;

        // bid information
        new_ask['order_info'] = orderinfo;
        new_ask['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
        //new_ask['deadline'] = moment(current).add(24, 'Hour');
        new_ask['price_info'] = priceinfo; 
        new_ask['status'] = orderinfo['state'];
        new_slot['add_ask'].push(new_ask);
        CtrlPrint[market][marketID]['cr_ask_slot'] = true;
        //console.log("[", market, "][", marketID, "] ################### New Slot - 1st Ask is added ################################");

        // check bid status : wait / done / 
        new_slot['last_bidask_info']['timetick'] = current;
        new_slot['last_bidask_info']['tr_price'] = current_price; //priceinfo['trade_price'];
        portfolio_info[market][marketID]['slots'].push(JSON.parse(JSON.stringify(new_slot)));

        // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
        if(portfolio_info[market][marketID]['last_bidask_info']['tr_price'] == 0 
            || portfolio_info[market][marketID]['last_bidask_info']['tr_price'] < new_slot['last_bidask_info']['tr_price'])
        {
            //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", new_slot['last_bidask_info']['tr_price'])
            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = new_slot['last_bidask_info']['timetick'];
            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = new_slot['last_bidask_info']['tr_price'];
        } 
        
        //if(CtrlPrint[market][marketID]['cr_ask_slot']) { console.log(JSON.stringify(portfolio_info)); }
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
            //last_bidask_price = ask[j]['price_info']['trade_price'];
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

                if (simulation)
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
                            //orderinfo = await upbit.input_orders(market, 'ask', new_ask['amount'], current_price, 'limit');
                            orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit'); new_ask['amount'] = 1;
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
                    // ask information
                    new_ask['order_info'] = orderinfo;
                    new_ask['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
                    //new_ask['deadline'] = moment(current).add(24, 'Hour');
                    new_ask['price_info'] = priceinfo; 
                    new_ask['invest_KRW'] = new_ask['amount'] * current_price;
                    new_ask['status'] = orderinfo['state'];
                    slots[i]['add_ask'].push(new_ask);
                    CtrlPrint[market][marketID]['addask'] = true;
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
                    //if(CtrlPrint[market][marketID]['addask']) { console.log(JSON.stringify(portfolio_info)); }
                }
            } 
        }
    }
}



/*
통계 집계 : Reverse Mode에 대해서 현재 slot 단위로 관리되는 거래에 대한 통계를 작성 및 관리한다.
*/
async function update_Reverse_TrInfo_Statics(market, marketID, priceinfo) {
    //if(CtrlPrint[market][marketID] == false) { return; }

    let slots = portfolio_info[market][marketID]['slots'];
    let config = portfolio_info[market][marketID]['config'];
    let current_price = priceinfo['trade_price'];

    sellcoin_count[market][marketID] = 0;

    let i = 0, j = 0;
    for (i = 0; i < slots.length; i++) {
        // unit slot 
        let statics = JSON.parse(JSON.stringify(statics_ask_info));
        for (j = 0; j < slots[i]['add_ask'].length; j++) {
            let askinfo = slots[i]['add_ask'][j];
            let orderinfo = askinfo['order_info'];
            if (askinfo['status'] !== "done") {
                let uuid = askinfo['order_info']['uuid'];
                orderinfo = await upbit.get_orderinfo(uuid);
                if ("error" in orderinfo) {
                    console.log("[", market, "][", marketID, "][", i, "][", j, "] UUID = ", uuid, " [update_Reverse_TrInfo_Statics] ERROR Get Order info ################################");
                    continue; //break;  // TBT (to be tested)
                }
            }
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
        statics['average'] = statics['sum_ask_KRW'] / statics['sum_amount_done']; // 평균 매도 가격
        statics['average_withfee'] = statics['sum_ask_KRW_withfee'] / statics['sum_amount_done']; // 평균 매도 가격

        //  reverse에서는 계산하는 의미가 없음.. 결과론 적으로 coin의 개수가 늘어야 함.
        statics['cur_eval_net_ratio'] = (statics['average_withfee'] - current_price) / statics['average_withfee'];  // 이익 비율
        statics['cur_eval_net_Coin'] = (statics['cur_eval_net_ratio'] * statics['sum_reclaim_KRW_withfee']) / current_price;    // 이익 코인 수 (증가량)
        slots[i]['statics'] = statics;
    }
    //console.log("#####################[Static Information]######################################");
    //console.log("Statics[", market, "][", marketID, "] = ", JSON.stringify(portfolio_info));
    if (filesave_count >= filesave_period) { filesave_count = 0; Save_JSON_file(portfolio_info, "./portfoilio.json"); }
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
        let sum_reclaim_KRW = cur_slot_statics['sum_reclaim_KRW'];
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
            if(simulation)
            {
                orderinfo['state'] = "increase_coin";
                orderinfo['volume'] = order_coin_count;
                orderinfo['executed_volume'] = order_coin_count;
                orderinfo['remaining_volume'] = 0;
                orderinfo['price'] = current_price; 
                //console.log("[", market, "][", marketID, "][slots", i, "] price = ", current_price, " input order amount = ", orderinfo['volume'], " sum_reclaim_KRW = ", sum_reclaim_KRW);
                slots[i]['status'] = "increase_coin"; // ask is completed
                slots[i]['increasecoin_orderinfo'] = orderinfo;

                let increaseData = slots[i];
                increaseData['config'] = config;
                //increasecoin_DB[market][marketID].push(slots[i]);
                increasecoin_DB[market][marketID].push(increaseData);
                slots.splice(i, 1);

                CtrlPrint[market][marketID]['increasecoin'] = true;
                // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                if(i == 0) 
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
                        //orderinfo = await upbit.input_orders(market, 'ask', order_coin_count, current_price, 'limit');
                        orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit');
                        //console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", order_coin_count);
                        slots[i]['status'] = "increase_coin"; // ask is completed
                        slots[i]['increasecoin_orderinfo'] = orderinfo;

                        let increaseData = slots[i];
                        increaseData['config'] = config;
                        //increasecoin_DB[market][marketID].push(slots[i]);
                        increasecoin_DB[market][marketID].push(increaseData);
                        slots.splice(i, 1);

                        CtrlPrint[market][marketID]['increasecoin'] = true;
                        // 마지막 slot이 익절되었을 경우 slot이 0인데 다시 1st slot을 생성하기 위한 기준 가격을 설정함. 설정이 잘되면 무한 자동 실행 됨. MACD 역배열 시점의 가격을 지정하는 것도 좋은 방법임.
                        if(i == 0) 
                        { 
                            portfolio_info[market][marketID]['last_bidask_info']['timetick'] = current;
                            portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = current_price;
                        }
                    }
                    else
                    {
                        // 잔고 부족시 남은 잔고라도 익절을 할지.... 그냥 slot을 유지할지.....고민 필요함. 우선 그냥 error message만 표시하고 유지하는 것으로 작성함.
                        //orderinfo = await upbit.input_orders(market, 'ask', balance['ask_account']['balance'], current_price, 'limit');
                        //orderinfo = await upbit.input_orders(market, 'ask', 1, current_price, 'limit');
                        console.log("[", market, "][", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Please check your Coin Balance!!");
                        console.log("[", market, "][", marketID, "][slots", i, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                    }
                }
                else { console.log("[", market, "][", marketID, "][slots", i, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
            }

            if(CtrlPrint[market][marketID]['increasecoin'])
            {
                //console.log("################### Increase Coin ######################")
                //console.log(JSON.stringify(increasecoin_DB));
                Save_JSON_file(increasecoin_DB, "increasecoin.json");
                //console.log("######################################################");
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
                if (simulation)
                {
                }
                else
                {
                    upbit.cancel_orders(cancel_uuid);   // need to do exception handling
                }
                cancel_orderlist[market][marketID].push(cancel);
                console.log("[", market, "][", marketID, "] Cancel time = ", current, " Cancel uuid = ", cancel_uuid)
                CtrlPrint[market][marketID]['cancel_uuid'] = true;
            }
        }
    }

    if (CtrlPrint[market][marketID]['cancel_uuid'])
    {
        //console.log("################### Cancel Orders ######################")
        //console.log(JSON.stringify(cancel_orderlist));
        Save_JSON_file(cancel_orderlist, "cancel_uuid_orderlist.json");
        //console.log("######################################################");
    }
}


/*
 1/3/5/10/15/30/60/240 분봉 데이터를 이용하여 MACD 정보를 가공한다.
*/
async function get_MACD(market, TimeVal, min, signal, MACD) {
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

function disiplay_statics(current)
{

    let elapsed = (current - static_previous) / 1000;
    if (elapsed > 5)
    {
        static_previous = current;
        process.stdout.write('\033c');
        for (market in portfolio_info)
        {
            for (marketID in portfolio_info[market])
            {
                let slots = portfolio_info[market][marketID]['slots'];
                let config = portfolio_info[market][marketID]['config'];
                let mode = config['trade_mode'];
                let sum_org_KRW = 0;
                let sum_net_KRW = 0;
                let sum_org_coin = 0;
                let sum_net_coin = 0;
                let average = 0;
                console.log("*************************************** Current Running Slots Information ***********************************************************");
                console.log("=====================================================================================================================================");
                for (let i = 0; i < slots.length; i++) {
                    let statics = slots[i]['statics'];
                    if (mode === 'normal') {
                        console.log("[N][", market, "][", marketID, "][ Slot", i, "][ Bid", slots[i]['add_bid'].length, "] Cur_Price =", statics['current_price'],
                            " Average = ", statics['average_withfee'].toFixed(2), " Coin Balance = ", statics['sum_amount_done'].toFixed(2), " Net Ratio = ",
                            statics['cur_eval_net_ratio'].toFixed(2), " Net KRW = ", statics['cur_eval_net_KRW'].toFixed(2));
                        sum_org_KRW += statics['sum_invest_KRW_withfee'];
                        sum_net_KRW += statics['cur_eval_net_KRW'];
                        sum_org_coin += statics['sum_amount_done'];
                    }
                    else {
                        console.log("[R][", market, "][", marketID, "][ Slot", i, "][ Ask", slots[i]['add_ask'].length, "] Cur_Price =", statics['current_price'],
                            " Average = ", statics['average_withfee'].toFixed(2), " Ask Coin = ", statics['sum_amount_done'], " Reclaim KRW Balance = ",
                            statics['sum_ask_KRW_withfee'].toFixed(2), " Net Ratio = ", statics['cur_eval_net_ratio'].toFixed(2), " Net Coin = ", statics['cur_eval_net_Coin'].toFixed(2));
                        sum_org_coin += statics['sum_amount_done'];
                        sum_net_coin += statics['cur_eval_net_Coin'];
                    }
                }
                console.log("=====================================================================================================================================");
                if (mode === 'normal') {
                    let net_KRW_ratio = (sum_net_KRW / (sum_org_KRW + 0.000001)) * 100;
                    net_KRW_ratio = net_KRW_ratio.toFixed(2);
                    average = sum_org_KRW / sum_org_coin;
                    average = average.toFixed(1) * 1;
                    sum_org_coin = sum_org_coin.toFixed(2) * 1;
                    console.log("[N][", market, "][", marketID, "] 투입금액 = ", sum_org_KRW.toFixed(2), " 매입 Coin = ", sum_org_coin, " Average = ", average, " 손익 = ", sum_net_KRW.toFixed(2), "Net Ratio = ", net_KRW_ratio);
                    console.log("=====================================================================================================================================");
                    console.log("\n")
                }
                else {
                    let net_Coin_ratio = (sum_net_coin / (sum_org_coin + 0.000001)) * 100;
                    net_Coin_ratio = net_Coin_ratio.toFixed(2);
                    console.log("[R][", market, "][", marketID, "] Coin 매도수량 = ", sum_org_coin.toFixed(2), " Coin 손익 = ", sum_net_coin.toFixed(2), "Net Ratio = ", net_Coin_ratio);
                    console.log("=====================================================================================================================================");
                    console.log("\n")
                }
            }
        }

        for (market in portfolio_info)
        {
            let sum_org_KRW = 0;
            let sum_net_KRW = 0;
            for (marketID in portfolio_info[market])
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
                    if (i < 10)
                    {
                        console.log("[N][", market, "][", marketID, "][ Slot", i, "] Cur_Price =", statics['current_price'],
                            " Average = ", statics['average_withfee'].toFixed(2), " Coin Balance = ", statics['sum_amount_done'].toFixed(2), " Net Ratio = ",
                            statics['cur_eval_net_ratio'].toFixed(2), " Net KRW = ", statics['cur_eval_net_KRW'].toFixed(2));
                    }
                }
                let cur_total_KRW = sum_org_KRW + sum_net_KRW;
                let net_ratio = (sum_net_KRW / (sum_org_KRW+0.000001)) * 100;
                net_ratio = net_ratio.toFixed(2);
                cur_total_KRW = cur_total_KRW.toFixed(2) * 1;
                console.log("=====================================================================================================================================");
                console.log("[", market, "][", marketID, "] Sum of org KRW = ", sum_org_KRW.toFixed(2), "Current Total KRW = ", cur_total_KRW,
                    " Sum of Net KRW = ", sum_net_KRW.toFixed(2), "Net Ratio = ", net_ratio);
                console.log("=====================================================================================================================================");
                console.log("\n")
            }
        }

        for (market in portfolio_info)
        {
            let sum_org_coin = 0;
            let sum_net_coin = 0;
            for (marketID in portfolio_info[market])
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

                    if (i < 10)
                    {
                        console.log("[R][", market, "][", marketID, "][ Slot", i, "] Cur_Price =", statics['current_price'],
                            " Average = ", statics['average_withfee'].toFixed(2), " Ask Coin = ", statics['sum_amount_done'], " Reclaim KRW Balance = ",
                            statics['sum_ask_KRW_withfee'].toFixed(2), " Net Ratio = ", statics['cur_eval_net_ratio'].toFixed(2), " Net Coin = ", statics['cur_eval_net_Coin'].toFixed(2));
                    }
                }
                let cur_total_coin = sum_org_coin + sum_net_coin;
                let net_ratio = (sum_net_coin / (sum_org_coin+0.000001)) * 100;
                net_ratio = net_ratio.toFixed(2);
                cur_total_coin = cur_total_coin.toFixed(2) * 1;
                console.log("=====================================================================================================================================");
                console.log("[", market, "][", marketID, "] Sum of org Coin = ", sum_org_coin.toFixed(2), "Current Total Coin = ", cur_total_coin,
                    " Sum of Net Coin = ", sum_net_coin.toFixed(2), "Net Ratio = ", net_ratio);
                console.log("=====================================================================================================================================");
                console.log("\n")
            }
        }
    }
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


smart_coin_trader();

module.exports = 
{ 
};
