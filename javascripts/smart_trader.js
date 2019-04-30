const sleep = require('sleep');
const fse = require('fs-extra');
const upbit = require("./upbit_restapi");

const tradefee = 0.0005;
const simulation = true;
//const simulation = false;

var staticPrint = { };

// default config value.......
var config_param = {
    max_slot_cnt : 10,          //* The limitation number of creating slots (unit : EA) 
    slot_1st_Bid_KRW : 5000,   //* fisrt investment moeny (unit : KRW)
    slot_2nd_Bid_KRW : 10000,  //* after 1st slot, investment moeny (unit : KRW)
    check_period : 5,           //* The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt : 5,              //* set retry count when restapi fails 
    target_rate : 0.5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_rate_adj : 0.05,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio : -0.5,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj : -0.05, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio : -1.1,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj : -0.01, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    max_addbid_cnt : 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    retry_delay : 2,            // set retry delay seconds when restapi fails (unit : Sec)
    limit_invest_krw : 0000,    // The limitation of invest money in current market. (unit : KRW)
    limit_invest_amount : 0000, // The limitation of cryptocurrency amount in current market. (unit : EA)
}


var bid_info = {
    order_info : 0, 
    deadline : 0, //'2019-04-10T10:00:00',
    price_info : 0,
    amount : 0,
    invest_KRW : 0, //'p*amount',
    status : 'none', //'none/done/wait/wait_expired', 
    /*
    timetick : 0,
    bid_uid : 0,
    status : 'none', //'none/done/wait/wait_expired', 
    price_info : 0,
    amount : 0,
    amount_done : 0, 
    amount_wait : 0,
    amount_done_ratio : 0, //'amount_done/amount',
    bid_KRW : 0, //'p*amount_done',
    rest_KRW : 0, //'p*amount_wait',
    invest_KRW : 0, //'p*amount',
    */
}


var statics_info = {
    current_price : 0,
    sum_amount : 0,
    sum_amount_done : 0, 
    sum_amount_wait : 0,
    sum_amount_done_ratio : 0, //'amount_done/amount',
    sum_bid_KRW : 0, //'sum(bidkw)',
    sum_rest_KRW : 0, //'sum(restkw)',
    sum_invest_KRW : 0, //'sum(investkw)',
    average : 0, //'sum_bidkw/sum_amount_done',
    cur_eval_net_ratio : 0,
    cur_eval_net_KRW : 0, //'cur_eval_net_ratio*sum_bidkw',
}

var slot_info = { 
    timetick : 0,
    market : 0, //"KRW-EOS",
    type : 0, //'first/others',
    trends_prev : 0, //'descent/ascent/parallel',
    trends_create : 0, //'descent', 
    trends_cur : 0, //'descent',
    status : 0, //'running / liquidation / suspend', 
    liquidation_orderinfo : 0, //'uid-xx-dd-wewerew-dd-00',
    statics : {},
    add_bid : [], //[ bid_info, ],
    last_bid_info : { timetick : 0, tr_price : 0 },
}


var portfolio = { config : config_param, last_bid_info : { timetick : 0, tr_price : 0 }, slots : [] }; // slot config & info......
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


var liquidation_DB = { }; // { 'KRW-EOS' : [ { }, { } .... ], };

/*
 1. db로 부터 market에 대한 config value를 읽어온다.
 2. db로 부터 portfolio market list를 얻어온다.
 3. 현재 marketID가 있으면 config value가 변경되었는지 확인 / 적용한다.
 4. marketID가 신규로 추가되었다면 portfolio_info에 추가하여 거래가 이루어 지도록 한다.
 5. marketID가 기존대비 삭제 되었다면 portfolio_info에서 삭제하여 bot이 동작하지 않도록 한다. 
*/ 

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
    
    // 1. make portfolio_info
    let portpolio_list = [ 'KRW-EOS', 'KRW-XRP' ];
    for (index in portpolio_list)
    {
        let marketID = portpolio_list[index]
        let pfolio = JSON.parse(JSON.stringify(portfolio));
        pfolio['config'] = JSON.parse(JSON.stringify(config_param));  // todo : portfolio에 편입된 marketID별 config를 설정해야 함.
        pfolio['slots'] = []; 
        portfolio_info[marketID] = JSON.parse(JSON.stringify(pfolio));
    }
    console.log("portfolio_info = ", JSON.stringify(portfolio_info));

    // 2. make MACD Information.
    for(index in portpolio_list)
    {
        let marketID = portpolio_list[index];
        timerID_info[marketID] = JSON.parse(JSON.stringify(timerID));
        for(key in timerID_info[marketID])
        {
            let data = [];
            let timeval = "MIN";
            if(key === "days") { timeval = "DAY"; } else if(key === "weeks") { timeval = "WEEK"; } else { timeval = "MIN"; }

            console.log("start timer : key = ", key, " marketID = ", marketID, "time = ", timerID_Minval[key], timerID_info[marketID][key]);
            if(timerID_info[marketID][key] === 0)
            {
                data = await get_MACD(marketID, timeval, timerID_Minval[key], 9, 26);
                if(data.length > 0 && (data != "error")) { MACD_info[marketID] = data; }
                data = []; 
                //console.log("First Init ==> MACD_info[", marketID, "]", " = ", JSON.stringify(MACD_info[marketID]));
            }

            // create timer
            timerID_info[marketID][key] = setInterval(async function () {
                data = await get_MACD(marketID, timeval, timerID_Minval[key], 9, 26);
                if(data.length > 0 && (data != "error")) { MACD_info[marketID] = data; } 
                //console.log("MACD_info[", marketID, "]", " = ", JSON.stringify(MACD_info[marketID]));
            }, timerID_Minval[key]*1000*60*2); 
            //console.log("TimerID_info[", marketID, "][", key, "] = ", timerID_info[marketID][key]);
        }
    }

    // 3. create the first slot
    while(1)
    {
        current = new Date();
        for(marketID in portfolio_info)
        {
            staticPrint[marketID] = false;
            if(previous.hasOwnProperty(marketID) === false) { previous[marketID] = 0; }
            if(elapsed.hasOwnProperty(marketID) === false) { elapsed[marketID] = 0; }
            elapsed[marketID] = (current - previous[marketID])/1000;
            if(elapsed[marketID] > portfolio_info[marketID]['config']['check_period'])
            {
                previous[marketID] = current;
                //console.log("Market = ", marketID, portfolio_info[marketID]['config']['check_period'], " sec priodic routine....");
                let priceinfo = await upbit.getCurrentPriceInfo(marketID);
                //console.log(marketID, " Price = ", JSON.stringify(priceinfo), "\n");

                // last bid price 기준으로 slot을 먼저 만들것인가? add_bid를 먼저 만들것인가? 고민이 필요 함. - 현재는 slot을 먼저 만드는 것으로 함.
                add_slot(marketID, current, priceinfo);

                // slot별로 탐색하여 add bid 조건에 맞는 case가 있는지 조사하고 조건에 맞다면 add_bid를 (물타기) 진행한다.
                add_bid(marketID, current, priceinfo); 

                // uuid로 정보를 조회하여 완료된 uuid / wait 중인 uuid 분류하고 statics를 정리한다.
                add_updateTrInfo_Statics(marketID, priceinfo);

                // 최종 정리된 DB 기준으로 수익율을 조사하고 수익이 났으면 청산한다.
                // (마지막 하나 남은 slot이면 청산하지 않고 수익분만 청산하고 초기 투자 금액은 유지한다. 또는 청산하고 last bid price 기준 하락시 new slot을 생성한다. 우선 후자로 결정함.)
                liquidation_slots(marketID, priceinfo);

                // expired 된 거래에 대해 취소여부를 결정하고 취소/유지 처리를 한다.
            }
        }
    }
}

/*
//upbit.get_orderslist('KRW-EOS', 'done', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderslist('KRW-EOS', 'wait', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderinfo("9d59aacb-7184-42e4-a78e-3b49beb041b4");
//upbit.input_orders('KRW-EOS', 'ask', 1, 9300, 'limit')
//upbit.input_orders('KRW-EOS', 'bid', 1, 5000, 'limit')
//upbit.cancel_orders('a0e58d55-8421-40ac-bf71-98b6899c8e2b');
*/
async function add_slot(marketID, current, priceinfo)
{
    let slots_length = portfolio_info[marketID]['slots'].length;
    let config = portfolio_info[marketID]['config'];
    let last_bid_price = portfolio_info[marketID]['last_bid_info']['tr_price'];
    let current_price = priceinfo[0]['trade_price'];
    let fall_gap_ratio = (current_price - last_bid_price)*100 / (last_bid_price + 1); // +1 to protect divid by zero

    if(slots_length >= config['max_slot_cnt']) 
    {
        console.log("[", marketID, "] The number of slots exceed max_slot_cnt !!!, slots count = ", slots_length);
        console.log(JSON.stringify(portfolio_info));
        return; 
    }

    if(slots_length > 0 && (fall_gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; }

    if(slots_length === 0)
    {
        if(last_bid_price === 0) // 1st slot creation operation
        {
        }
        else // all slots are liquidated, there is no slots --> need to create new 1st slot when cur_price *  < last_bid_price)  
        {
            fall_gap_ratio = (current_price - last_bid_price)*100 / last_bid_price;
            if((fall_gap_ratio > (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']))) { return; } // -5% > -6% return, -7% <= -6% : create new slot.
        }
    }


    // create new slot condition.
    let new_slot = JSON.parse(JSON.stringify(slot_info));
    let new_bid = JSON.parse(JSON.stringify(bid_info));

    // slot is empty...
    if(slots_length == 0)
    {
        console.log("[", marketID, "] Create New 1st Slots. Price = ", current_price);
        new_slot['type'] = "first";
        new_bid['amount'] = portfolio_info[marketID]['config']['slot_1st_Bid_KRW'] / priceinfo[0]['trade_price'];
        new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee
        new_bid['invest_KRW'] = portfolio_info[marketID]['config']['slot_1st_Bid_KRW'];
    }
    else // second/others slot creation condition.
    {
        console.log("[", marketID, "] Create additional Slots. Price = ", current_price, "Fall Gap = ", (config['new_slot_Create_Ratio'] + config['new_slot_Create_Ratio_adj']));
        new_slot['type'] = "others";
        new_bid['amount'] = portfolio_info[marketID]['config']['slot_2nd_Bid_KRW'] / priceinfo[0]['trade_price'];
        new_bid['amount'] = new_bid['amount'] * (1 - tradefee);  // minus trade fee
        new_bid['invest_KRW'] = portfolio_info[marketID]['config']['slot_2nd_Bid_KRW'];
    }

    // Order Input (add bid)
    let orderinfo = { };
    if(simulation)
    {
        orderinfo['state'] = "done";
        orderinfo['volume'] = new_bid['amount'];                            
        orderinfo['executed_volume']= new_bid['amount'];   
        orderinfo['remaining_volume'] = 0;
        orderinfo['price'] = current_price; 
    }
    else
    {
        // 잔고 Check후 input order
        let balance = await upbit.get_chance(marketID);
        let order_money = (new_bid['amount'] * current_price);
        order_money = order_money * (1 + tradefee);
        if(balance['bid_account']['currency'] === "KRW" && balance['market']['id'] === marketID)
        {
            if(balance['bid_account']['balance'] >= order_money) // Order Input (add bid)
            {
                //orderinfo = await upbit.input_orders(marketID, 'bid', new_bid['amount'], current_price, 'limit');
                orderinfo = await upbit.input_orders(marketID, 'bid', 1, (current_price*0.7), 'limit');
                console.log("[", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
            }
            else
            {
                let org_bid = new_bid['amount'];
                order_money = balance['bid_account']['balance'];
                new_bid['amount'] = order_money / current_price;
                new_bid['amount'] = new_bid['amount']  * (1 - tradefee);  // minus trade fee
                //orderinfo = await upbit.input_orders(marketID, 'bid', new_bid['amount'], current_price, 'limit');
                orderinfo = await upbit.input_orders(marketID, 'bid', 1, (current_price*0.7), 'limit');
                console.log("[", marketID, "] Insuffient Balance on your account!!! adjust input order amount!!");
                console.log("[", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " orgBid = ", org_bid, " price = ", current_price, " input order amount = ", new_bid['amount'], " Invest KRW(order_money) = ", order_money);
            }
        }
        else { console.log("[", marketID, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
    }

    if("error" in orderinfo) 
    { 
        console.log ("[", marketID, "] Input Order Error : Can't create new slot...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
        console.log ("[", marketID, "] Message = ", orderinfo['error']['message']); 
    }
    else 
    { 
        new_slot['timetick'] = current;
        new_slot['market'] = marketID;
        new_slot['trends_prev'] = 0; // need to call MACD and check trends.
        new_slot['trends_create'] = 0; // need to call
        new_slot['trends_cur'] = 0;
        new_slot['status'] = "running";
        new_slot['liquidation_orderinfo'] = 0;

        // bid information
        new_bid['order_info'] = orderinfo;
        new_bid['deadline'] = new Date(Date.now() + 1*24*60*60*1000); // cur = new Date();
        new_bid['price_info'] = priceinfo[0]; 
        new_bid['status'] = orderinfo['state'];
        new_slot['add_bid'].push(new_bid);
        staticPrint[marketID] = true;
        console.log("MarketID = ", marketID, "################### New Slot - 1st Bid is added ################################");

        // check bid status : wait / done / 
        new_slot['last_bid_info']['timetick'] = current;
        new_slot['last_bid_info']['tr_price'] = priceinfo[0]['trade_price'];
        portfolio_info[marketID]['slots'].push(JSON.parse(JSON.stringify(new_slot)));

        // Update last_bid_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
        if(portfolio_info[marketID]['last_bid_info']['tr_price'] == 0 || portfolio_info[marketID]['last_bid_info']['tr_price'] > new_slot['last_bid_info']['tr_price'])
        {
            console.log("Update Last Bid Price infomation....Old = ", portfolio_info[marketID]['last_bid_info']['tr_price'], "Latest = ", new_slot['last_bid_info']['tr_price'])
            portfolio_info[marketID]['last_bid_info']['timetick'] = new_slot['last_bid_info']['timetick'];
            portfolio_info[marketID]['last_bid_info']['tr_price'] = new_slot['last_bid_info']['tr_price'];
        } 
        
        if(staticPrint[marketID]) { console.log(JSON.stringify(portfolio_info)); }
    }
}


/*
물타기 함수 : 현재 slot 기준에서 last bid에서 config에 정의된 하락율을 초과할 경우 물타기 진행함.
*/
async function add_bid(marketID, current, priceinfo)
{
    let slots = portfolio_info[marketID]['slots'];
    let config = portfolio_info[marketID]['config'];
    let current_price = priceinfo[0]['trade_price'];

    let i = 0, j = 0;
    for(i = 0; i < slots.length; i++)
    {
        let bid_sum = 0;
        let last_bid_price = 0; //slots[i]['last_bid_info']['tr_price'];
        for(j = 0; j < slots[i]['add_bid'].length; j++)
        {
            bid_sum += slots[i]['add_bid'][j]['amount'];
            last_bid_price = slots[i]['add_bid'][j]['price_info']['trade_price'];
        }

        let fall_gap_ratio = (current_price - last_bid_price)*100 / last_bid_price;

        if(j >= config['max_addbid_cnt']) 
        { 
            console.log("[", marketID, "][", i, "][", j, "] bid count = ", j, " exceed max_addbid_cnt[",config['max_addbid_cnt'], "]" );
        }
        else
        {
            if(fall_gap_ratio < (config['new_addbid_Create_Ratio'] + config['new_addbid_Create_Ratio_adj'])) 
            {
                // Order Input (add bid)
                let orderinfo = { };
                if(simulation)
                {
                    orderinfo['state'] = "done";
                    orderinfo['volume'] = bid_sum;
                    orderinfo['executed_volume']= bid_sum;
                    orderinfo['remaining_volume'] = 0;
                    orderinfo['price'] = current_price; 
                }
                else
                {
                    // 잔고 Check후 input order
                    let balance = await upbit.get_chance(marketID);
                    let order_money = (bid_sum * current_price);
                    order_money = order_money * (1 + tradefee);
                    if(balance['bid_account']['currency'] == "KRW" && balance['market']['id'] === marketID)
                    {
                        if(balance['bid_account']['balance'] >= order_money) // Order Input (add bid)
                        {
                            //orderinfo = await upbit.input_orders(marketID, 'bid', bid_sum, current_price, 'limit');
                            orderinfo = await upbit.input_orders(marketID, 'bid', 1, (current_price*0.7), 'limit');
                            console.log("[", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " price = ", current_price, " input order amount = ", bid_sum, " Invest KRW(order_money) = ", order_money);
                        }
                        else
                        {
                            order_money = balance['bid_account']['balance'];
                            let org_bid_sum = bid_sum;
                            bid_sum = order_money / current_price;
                            bid_sum = bid_sum  * (1 - tradefee);  // minus trade fee
                            //orderinfo = await upbit.input_orders(marketID, 'bid', bid_sum, current_price, 'limit');
                            orderinfo = await upbit.input_orders(marketID, 'bid', 1, (current_price*0.7), 'limit');
                            console.log("[", marketID, "] Insuffient Balance on your account!!! adjust input order amount!!");
                            console.log("[", marketID, "] Balance(KRW) = ", balance['bid_account']['balance'], " orgBid_sum = ", org_bid_sum, " price = ", current_price, " input order amount = ", bid_sum, " Invest KRW(order_money) = ", order_money);
                        }
                    }
                    else { console.log("[", marketID, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
                }

                if("error" in orderinfo) 
                {
                    console.log ("[", marketID, "] Input Order Error : Can't create new additional bid...+++++++++++++++++++++++++++++++++++++++++++++++++++"); 
                    console.log ("[", marketID, "] Message = ", orderinfo['error']['message']); 
                }
                else
                {
                    let new_bid = JSON.parse(JSON.stringify(bid_info));
                    // bid information
                    new_bid['order_info'] = orderinfo;
                    new_bid['deadline'] = new Date(Date.now() + 1*24*60*60*1000); // cur = new Date();
                    new_bid['price_info'] = priceinfo[0]; 
                    new_bid['amount'] = bid_sum;
                    new_bid['invest_KRW'] = bid_sum * current_price;
                    new_bid['invest_KRW'] = new_bid['invest_KRW'] * (1 + tradefee);  // add trade fee to total investment money.
                    new_bid['status'] = orderinfo['state'];
                    slots[i]['add_bid'].push(new_bid);
                    staticPrint[marketID] = true;
                    console.log("[", marketID, "][", i, "][", j, "] Amount = ", bid_sum, " ################### Additional Bid is added ################################");

                    // Update last_bid_info : this is basic routine... To find the lowest bid price, search all slots and bids price and compare it with for loop.
                    slots[i]['last_bid_info']['timetick'] = current;
                    slots[i]['last_bid_info']['tr_price'] = current_price;
                
                    if(portfolio_info[marketID]['last_bid_info']['tr_price'] > slots[i]['last_bid_info']['tr_price'])
                    {
                        console.log("Update Last Bid Price infomation....Old = ", portfolio_info[marketID]['last_bid_info']['tr_price'], "Latest = ", slots[i]['last_bid_info']['tr_price'])
                        portfolio_info[marketID]['last_bid_info']['timetick'] = slots[i]['last_bid_info']['timetick'];
                        portfolio_info[marketID]['last_bid_info']['tr_price'] = slots[i]['last_bid_info']['tr_price'];
                    } 
                    if(staticPrint[marketID]) { console.log(JSON.stringify(portfolio_info)); }
                }
            } 
        }
    }
}

/*
수익실현 함수 : 현재 slot 단위로 config에 정의된 target rate를 초과한 이익이 발생할 경우 수익 실현을 한다. 
*/
async function liquidation_slots(marketID, priceinfo)
{
    let slots = portfolio_info[marketID]['slots'];
    let config = portfolio_info[marketID]['config'];
    let current_price = priceinfo[0]['trade_price'];

    let i = 0, j = 0;
    for(i = 0; i < slots.length; i++)
    {
        let target = config['target'] + config['target_rate_adj'];
        let cur_slot_statics = slots[i]['statics'];
        let cur_eval_net_ratio = cur_slot_statics['cur_eval_net_ratio'];
        let sum_amount_done = cur_slot_statics['sum_amount_done'];
        let average = cur_slot_statics['average'];
        let sum_invest_KRW = cur_slot_statics['sum_invest_KRW'];
        let cur_eval_net_KRW = cur_slot_statics['cur_eval_net_KRW'];

        if(cur_eval_net_ratio > target) 
        {
            console.log("################### Liquidation ######################")
            console.log("[", marketID, "][slots", i, "] Target = ", target, " Current Eval net Ratio = ", cur_eval_net_ratio); 
            console.log("[", marketID, "][slots", i, "] Average Price = ", average, " Liquidation Price = ", current_price, " Amount = ", sum_amount_done); 
            console.log("[", marketID, "][slots", i, "] sum_invest_KRW = ", sum_invest_KRW, " Sum of Net Profit(KRW,이익) = ", cur_eval_net_KRW); 
            console.log("######################################################")
            let orderinfo = { };
            if(simulation)
            {
                orderinfo['state'] = "liquidation";
                orderinfo['volume'] = sum_amount_done;
                orderinfo['executed_volume']= sum_amount_done;
                orderinfo['remaining_volume'] = 0;
                orderinfo['price'] = current_price; 
                console.log("[", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done, " cur_eval_net_KRW = ", cur_eval_net_KRW);
                slots[i]['status'] = "liquidation"; // ask is completed
                liquidation_DB[marketID].push(slots[i]);
                slots[i]['liquidation_orderinfo'] = orderinfo;
            }
            else
            {
                // 잔고 Check후 input order
                let balance = await upbit.get_chance(marketID);
                if(balance['market']['id'] === marketID)
                {
                    if(balance['ask_account']['balance'] >= sum_amount_done) // Order Input (add ask)
                    {
                        //orderinfo = await upbit.input_orders(marketID, 'ask', sum_amount_done, current_price, 'limit');
                        orderinfo = await upbit.input_orders(marketID, 'ask', 1, current_price, 'limit');
                        console.log("[", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done, " cur_eval_net_KRW = ", cur_eval_net_KRW);
                        slots[i]['status'] = "liquidation"; // ask is completed
                        slots[i]['liquidation_orderinfo'] = orderinfo;
                        liquidation_DB[marketID].push(slots[i]);
                        //slots.splice(i, 1);
                    }
                    else
                    {
                        // 잔고 부족시 남은 잔고라도 익절을 할지.... 그냥 slot을 유지할지.....고민 필요함. 우선 그냥 error message만 표시하고 유지하는 것으로 작성함.
                        //orderinfo = await upbit.input_orders(marketID, 'ask', balance['ask_account']['balance'], current_price, 'limit');
                        //orderinfo = await upbit.input_orders(marketID, 'ask', 1, current_price, 'limit');
                        console.log("[", marketID, "][slots", i, "] Insuffient Coin Balance on your account!!! Please check your Coin Balance!!");
                        console.log("[", marketID, "][slots", i, "] Balance(Coin) = ", balance['ask_account']['balance'], " price = ", current_price, " input order amount = ", sum_amount_done);
                    }
                }
                else { console.log("[", marketID, "][slots", i, "] **********Check Balance ERROR************"); orderinfo = { 'error' : { 'message' : "User define error" } } }
            }
            console.log(liquidation_DB[marketID]);
            Save_JSON_file(liquidation_DB[marketID], "../test/" + marketID + "_liquidation.json");
        }
    }
}


/*
통계 집계 : 현재 slot 단위로 관리되는 거래에 대한 통계를 작성 및 관리한다.
*/
async function add_updateTrInfo_Statics(marketID, priceinfo)
{
    //if(staticPrint[marketID] == false) { return; }

    let slots = portfolio_info[marketID]['slots'];
    let config = portfolio_info[marketID]['config'];
    let current_price = priceinfo[0]['trade_price'];
    let i = 0, j = 0;

    for(i = 0; i < slots.length; i++)
    {
        // unit slot 
        let statics = JSON.parse(JSON.stringify(statics_info)); 
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
                    console.log("[", marketID, "][", i, "][", j, "] UUID = ", uuid , " [add_updateTrInfo] ERROR Get Order info ################################");
                    continue; //break; 
                }
            }
            bidinfo['status'] = orderinfo['state'];
            statics['current_price'] = current_price;
            statics['sum_amount'] += orderinfo['volume'];
            statics['sum_amount_done'] += orderinfo['executed_volume'];
            statics['sum_amount_wait'] += orderinfo['remaining_volume'];
            statics['sum_bid_KRW'] += orderinfo['executed_volume']*orderinfo['price'];
            statics['sum_rest_KRW'] += orderinfo['remaining_volume']*orderinfo['price'];
            statics['sum_invest_KRW'] += orderinfo['volume']*orderinfo['price'];
            statics['sum_invest_KRW'] = statics['sum_invest_KRW'] * (1 + tradefee);
        }
        statics['sum_amount_done_ratio'] = statics['sum_amount_done']/statics['sum_amount'];
        statics['average'] = statics['sum_bid_KRW']/statics['sum_amount_done'];
        statics['cur_eval_net_ratio'] = (current_price - statics['average'])/statics['average'];
        statics['cur_eval_net_KRW'] = statics['cur_eval_net_ratio'] * statics['sum_invest_KRW'];
        slots[i]['statics'] = statics;
    }
    console.log("#####################[Static Information]######################################");
    console.log("Statics[", marketID, "] = ", JSON.stringify(portfolio_info));
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
    try{
        do{
            data = await upbit.getCandleData(market, TimeVal, min, 200);  
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
