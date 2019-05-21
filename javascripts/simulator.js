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

var sellcoin_count = {}; // reverse mode에서 현재까지 매도된 coin 수량
var total_invest_KRW = {}; // normal mode에서 현재까지 매수/투자된 KRW 합
const trade_fee = {}; // { MARKET : { ASK : 0.05, BID : 0.05 } }

// normal mode
var config_bid_param = {
    trade_mode: 'normal',
    max_slot_cnt: 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Bid_KRW: 5000,   //* fisrt investment moeny (unit : KRW)
    slot_2nd_Bid_KRW: 10000,  //* after 1st slot, investment moeny (unit : KRW)
    check_period: 1,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt: 5,              //* set retry count when restapi fails 
    target_ask_rate: 5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -5,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    max_addbid_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay: 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 1000000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// reverse mode
var config_ask_param = {
    trade_mode: 'reverse',
    max_slot_cnt: 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Ask_Coin: 1,   //* fisrt investment coint (unit : EA)
    slot_2nd_Ask_Coin: 2,  //* after 1st slot, investment coin (unit : EA)
    check_period: 1,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt: 5,              //* set retry count when restapi fails 
    target_bid_rate: 5,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj: 1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: 3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio: 5,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    max_addask_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay: 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_coin: 200000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 0000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
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
    //'KRW-EOS_ID2': config_ask_param, 
    /*
    'KRW-ETH_ID2' : config_bid_param, 
    'KRW-BCH_ID3' : config_bid_param, 
    'KRW-XRP_ID4' : config_bid_param, 
    'KRW-BTC_ID5' : config_bid_param, 
    */
};


function * price_generator(min, max, step, start, direction)
{
    let cur_price = start;
    while(1)
    {
        if(direction)   // true : increase
        {
            if (max > cur_price) { cur_price += step; } //else { direction = false; }
        }
        else    // false : decrease
        {
            if (cur_price > min) { cur_price -= step; } //else { direction = true; }
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
async function Config_Simulator()
{
    let current = 0;
    let previous = {};
    let elapsed = {};

    // 1. Initialize DB
    for (key in portpolio_list)
    {
        let market, marketID;
        market = marketID = key;
        marketID = marketID.split('_')[1];
        market = market.split('_')[0];

        let pfolio = JSON.parse(JSON.stringify(portfolio));
        pfolio['config'] = JSON.parse(JSON.stringify(portpolio_list[key]));  // todo : portfolio에 편입된 marketID별 config를 설정해야 함.
        pfolio['slots'] = [];

        if (portfolio_info.hasOwnProperty(market) === false) { portfolio_info[market] = {}; }
        portfolio_info[market][marketID] = JSON.parse(JSON.stringify(pfolio));

        if (total_invest_KRW.hasOwnProperty(market) === false) { total_invest_KRW[market] = {}; }
        if (total_invest_KRW[market].hasOwnProperty(marketID) === false) { total_invest_KRW[market][marketID] = 0; }

        if (sellcoin_count.hasOwnProperty(market) === false) { sellcoin_count[market] = {}; }
        if (sellcoin_count[market].hasOwnProperty(marketID) === false) { sellcoin_count[market][marketID] = 0; }
    }
    console.log("portfolio_info = ", JSON.stringify(portfolio_info));

    let prev_priceinfo = {};
    let priceinfo = {};

    for (market in portfolio_info)
    {
        priceinfo[market] = {};
        priceinfo[market]['trade_price'] = 0;
        prev_priceinfo[market] = {};
        prev_priceinfo[market]['trade_price'] = 0;
    }

    // 2. create the first slot
    //while (config['max_slot_cnt'] || config['max_addbid_cnt'])
    while (1)
    {
        current = new Date();

        for (market in portfolio_info)
        {
            if (previous.hasOwnProperty(market) === false) { previous[market] = {}; }
            if (elapsed.hasOwnProperty(market) === false) { elapsed[market] = {}; }

            for (marketID in portfolio_info[market])
            {
                if (previous[market].hasOwnProperty(marketID) === false) { previous[market][marketID] = 0; }
                if (elapsed[market].hasOwnProperty(marketID) === false) { elapsed[market][marketID] = 0; }

                elapsed[market][marketID] = (current - previous[market][marketID]) / 1000;

                //if (elapsed[market][marketID] > portfolio_info[market][marketID]['config']['check_period'])
                {
                    let tradeMode = portfolio_info[market][marketID]['config']['trade_mode'];
                    let cur_p = getPrice[market][marketID].next().value;

                    previous[market][marketID] = current;

                    prev_priceinfo[market]['trade_price'] = priceinfo[market]['trade_price'];
                    priceinfo[market]['trade_price'] = cur_p;

                    //console.log("[", market, "][", marketID, "] Current = ", current, " priceinfo = ", priceinfo[market]['trade_price'], "Prev_price = ", prev_priceinfo[market]['trade_price']);

                    if (tradeMode === "normal")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        create_new_bid_slot(market, marketID, current, priceinfo[market]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                        add_bid_to_slot(market, marketID, current, priceinfo[market]);

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        update_Normal_TrInfo_Statics(market, marketID, priceinfo[market]);
                    }
                    else if (tradeMode === "reverse")
                    {
                        // last bid price 기준으로 slot을 먼저 만들것인가? add_ask를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                        create_new_ask_slot(market, marketID, current, priceinfo[market]);

                        // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_ask를 (코인을 팔아 현금확보) 진행한다.
                        add_ask_to_slot(market, marketID, current, priceinfo[market]);

                        // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                        update_Reverse_TrInfo_Statics(market, marketID, priceinfo[market]);
                    }
                    else
                    {
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                        console.log("========= Configuration Error =============");
                        console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                    }
                }
            }
        }
        disiplay_statics(current, 5);
    }
    Save_JSON_file(portfolio_info, "./simulation_portfoilio.json");
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
    let gap_ratio = (current_price - last_bidask_price) * 100 / (last_bidask_price + 1); // +1 to protect divid by zero

    config['minimum_order_coin'] = (config['minimum_order_KRW'] * 1.1) / current_price;  // (500 KRW * 1.1) / current price

    if (slots_length >= config['max_slot_cnt'])
    {
        //console.log("[", market, "][", marketID, "] The number of slots exceed max_slot_cnt !!!, slots count = ", slots_length);
        //console.log(JSON.stringify(portfolio_info));
        return;
    }

    if (slots_length > 0 && (gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; }

    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_bid_info));
    let new_bid = JSON.parse(JSON.stringify(bid_info));

    // slot is empty...
    if (slots_length == 0)
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

    if (current_price <= 5) { return; }  // 최 저점이라 판단 되면 simulation 종료함.

    if ((total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config['limit_invest_KRW'])
    {
        //console.log("[Create New Slots] == (total_invest_KRW[market][marketID] + orderinfo['invest_KRW']) >= limit_invest_KRW");
        return;
    }

    // Order Input (add bid)
    let orderinfo = {};

    orderinfo['uuid'] = "ddddddddddd-dddddddd";
    orderinfo['state'] = "done";
    orderinfo['volume'] = new_bid['amount'];
    orderinfo['executed_volume'] = new_bid['amount'];
    orderinfo['remaining_volume'] = 0;
    orderinfo['price'] = current_price;

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
    new_bid['price_info'] = priceinfo;
    new_bid['status'] = orderinfo['state'];
    new_slot['add_bid'].push(new_bid);
    //console.log("[", market, "][", marketID, "] ################### New Slot - 1st Bid is added ################################");

    // check bid status : wait / done / 
    new_slot['last_bidask_info']['timetick'] = current;
    new_slot['last_bidask_info']['tr_price'] = current_price; //priceinfo['trade_price'];
    portfolio_info[market][marketID]['slots'].push(JSON.parse(JSON.stringify(new_slot)));

    // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
    if (portfolio_info[market][marketID]['last_bidask_info']['tr_price'] == 0
        || portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > new_slot['last_bidask_info']['tr_price'])
    {
        //console.log("Update Last Bid Price infomation....Old = ", portfolio_info[market][marketID]['last_bidask_info']['tr_price'], "Latest = ", new_slot['last_bidask_info']['tr_price'])
        portfolio_info[market][marketID]['last_bidask_info']['timetick'] = new_slot['last_bidask_info']['timetick'];
        portfolio_info[market][marketID]['last_bidask_info']['tr_price'] = new_slot['last_bidask_info']['tr_price'];
    }

    //console.log(JSON.stringify(portfolio_info)); 
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
    for (i = 0; i < slots.length; i++)
    {
        let bid_sum = 0;
        let last_bidask_price = 0; //slots[i]['last_bidask_info']['tr_price'];
        let bid = slots[i]['add_bid'];

        for (j = 0; j < bid.length; j++)
        {
            bid_sum += bid[j]['amount'];
            bid_sum *= 1;
            //last_bidask_price = bid[j]['price_info']['trade_price'];
            last_bidask_price = slots[i]['last_bidask_info']['tr_price'];
            //console.log("[S", i, "][B", j, "][bid.length=", bid.length, "][last_bidask_price=", last_bidask_price, "]");
        }

        let gap_ratio = (current_price - last_bidask_price) * 100 / (last_bidask_price + 1);

        if (bid.length >= config['max_addbid_cnt'])
        {
            //console.log("[", market, "][", marketID, "][", i, "] bid.length(count) = ", bid.length, " j = ", j, " exceed max_addbid_cnt[",config['max_addbid_cnt'], "]" );
        }
        else
        {
            if (gap_ratio < (config['new_addbid_Create_Ratio'] + config['new_addbid_Create_Ratio_adj']))
            {
                // Order Input (add bid)
                let new_bid = JSON.parse(JSON.stringify(bid_info));
                let orderinfo = {};

                new_bid['amount'] = bid_sum;
                new_bid['invest_KRW'] = bid_sum * current_price;

                if ((total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config['limit_invest_KRW'])
                {
                    //console.log("[Create New bid] == (total_invest_KRW[market][marketID] + new_bid['invest_KRW']) >= config[limit_invest_KRW]");
                    return;
                }

                orderinfo['state'] = "done";
                orderinfo['volume'] = bid_sum;
                orderinfo['executed_volume'] = bid_sum;
                orderinfo['remaining_volume'] = 0;
                orderinfo['price'] = current_price;
                // bid information
                new_bid['order_info'] = orderinfo;
                new_bid['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
                //new_bid['deadline'] = moment(current).add(24, 'Hour');
                new_bid['price_info'] = priceinfo;
                new_bid['amount'] = bid_sum;
                new_bid['invest_KRW'] = bid_sum * current_price;

                if (new_bid['invest_KRW'] <= config['minimum_order_KRW']) { return; }  // 최소 주문금액보다 작으면 가격이 최 저점이라 판단하고 simulation 종료함.

                new_bid['status'] = orderinfo['state'];
                slots[i]['add_bid'].push(new_bid);
                //console.log("[", market, "][", marketID, "][", i, "][", j, "] Amount = ", bid_sum, " ################### Additional Bid is added ################################");

                // Update last_bidask_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
                slots[i]['last_bidask_info']['timetick'] = current;
                slots[i]['last_bidask_info']['tr_price'] = current_price;

                if (portfolio_info[market][marketID]['last_bidask_info']['tr_price'] > slots[i]['last_bidask_info']['tr_price'])
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

    if (current_price <= 5) { return; }  // 최 저점이라 판단 되면 simulation 종료함.

    if ((sellcoin_count[market][marketID] + new_ask['amount']) >= config['limit_invest_coin'])
    {
        //console.log("(sellcoin_count[market][marketID] + orderinfo['volume']) >= limit_invest_coin");
        return;
    }

    // Order Input (add ask)
    let orderinfo = { };

    orderinfo['uuid'] = "ddddddddddd-dddddddd";
    orderinfo['state'] = "done";
    orderinfo['volume'] = new_ask['amount'];                            
    orderinfo['executed_volume'] = new_ask['amount'];   
    orderinfo['remaining_volume'] = 0;
    orderinfo['price'] = current_price; 

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
    new_ask['price_info'] = priceinfo; 
    new_ask['status'] = orderinfo['state'];
    new_slot['add_ask'].push(new_ask);
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
        
    //console.log(JSON.stringify(portfolio_info)); 
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

        let gap_ratio = (current_price - last_bidask_price) * 100 / (last_bidask_price + 1);

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

                // ask information
                new_ask['order_info'] = orderinfo;
                new_ask['deadline'] = new Date(Date.now() + expiredtime); // cur = new Date();
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
                //console.log(JSON.stringify(portfolio_info)); 
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
}




/*******************************************************************************************************/
//  Common Function
/*******************************************************************************************************/
let static_previous = 0;

function disiplay_statics(current, display_period)
{
    let elapsed = (current - static_previous) / 1000;

    if (elapsed > display_period)
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


Config_Simulator();

module.exports = 
{ 
};
