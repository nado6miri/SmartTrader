const sleep = require('sleep');
const upbit = require("./upbit_restapi");

var config = {
    market : 'KRW-EOS',         // market name
    cur_status : 'running',     // 'running, suspend, closed'
    run_mode : 0,               // 0 : init (clear - liquidation), 1 : running, 2 : suspend
    check_preiod : 5,           // The price check duration of main loop, unit is second. (unit : Sec)
    retry_cnt : 5,              // set retry count when restapi fails 
    retry_delay : 5,            // set retry delay seconds when restapi fails (unit : Sec)
    slot_cnt : 0,               // The number of slots in current market.
    total_crcy_amount : 000,    // Total amount of cryptocurrency in current market. (unit : EA)
    total_invest_krw : 000,     // Total investment money in current market. (unit : KRW)
    total_eval_krw : 200,       // The amount of evaluation (평가금액) in current market. (unit : KRW)
    limit_invest_krw : 0000,    // The limitation of invest money in current market. (unit : KRW)
    limit_invest_amount : 0000, // The limitation of cryptocurrency amount in current market. (unit : EA)
    cur_slot_net_ratio : 20,    // The ratio of net margin in current market. (unit : %)
    cur_slot_net_krw : 20,      // The amount(KRW) of net margin in current market. (unit : KRW) 
    target_rate : 5,            // The ratio of liquidation margin in each slot. (unit : %)
    target_rate_adj : 1,        // The adjustment ratio of target_rate
    new_slot_crcond : -3,       // The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_crcond_adj : -0.3, // The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    max_addbid_cnt : 10,        // The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    add_bid_config : {
        ascent :  [ 
            { add_bid : "first_bid_amount", ratio : 'first_bid_price * 0.95' },     // bid amount, the percentage of price to create new bid
            { add_bid : 'sum(add_bid(0:1))', ratio : 'first_bid_price * 0.90' }, 
            { add_bid : 'sum(add_bid(0:2))', ratio : 'first_bid_price * 0.80' }, 
            { add_bid : 'sum(add_bid(0:3))', ratio : 'first_bid_price * 0.70' }, 
            { add_bid : 'sum(add_bid(0:4))', ratio : 'first_bid_price * 0.60' }, 
            { add_bid : 'sum(add_bid(0:5))', ratio : 'first_bid_price * 0.50' }, 
            { add_bid : 'sum(add_bid(0:6))', ratio : 'first_bid_price * 0.40' }, 
            { add_bid : 'sum(add_bid(0:7))', ratio : 'first_bid_price * 0.30' }, 
            { add_bid : 'sum(add_bid(0:8))', ratio : 'first_bid_price * 0.20' }, 
            { add_bid : 'sum(add_bid(0:9))', ratio : 'first_bid_price * 0.10' }, 
        ] ,
        descent :  [ 
            { add_bid : "first_bid_amount", ratio : 'first_bid_price * 0.95' }, 
            { add_bid : 'sum(add_bid(0:1))', ratio : 'first_bid_price * 0.90' }, 
            { add_bid : 'sum(add_bid(0:2))', ratio : 'first_bid_price * 0.80' }, 
            { add_bid : 'sum(add_bid(0:3))', ratio : 'first_bid_price * 0.70' }, 
            { add_bid : 'sum(add_bid(0:4))', ratio : 'first_bid_price * 0.60' }, 
            { add_bid : 'sum(add_bid(0:5))', ratio : 'first_bid_price * 0.50' }, 
            { add_bid : 'sum(add_bid(0:6))', ratio : 'first_bid_price * 0.40' }, 
            { add_bid : 'sum(add_bid(0:7))', ratio : 'first_bid_price * 0.30' }, 
            { add_bid : 'sum(add_bid(0:8))', ratio : 'first_bid_price * 0.20' }, 
            { add_bid : 'sum(add_bid(0:9))', ratio : 'first_bid_price * 0.10' }, 
        ] ,
        parallel :  [ 
            { add_bid : "first_bid_amount", ratio : 'first_bid_price * 0.97' }, 
            { add_bid : 'sum(add_bid(0:1))', ratio : 'first_bid_price * 0.93' }, 
            { add_bid : 'sum(add_bid(0:2))', ratio : 'first_bid_price * 0.90' }, 
            { add_bid : 'sum(add_bid(0:3))', ratio : 'first_bid_price * 0.85' }, 
            { add_bid : 'sum(add_bid(0:4))', ratio : 'first_bid_price * 0.80' }, 
            { add_bid : 'sum(add_bid(0:5))', ratio : 'first_bid_price * 0.75' }, 
            { add_bid : 'sum(add_bid(0:6))', ratio : 'first_bid_price * 0.70' }, 
            { add_bid : 'sum(add_bid(0:7))', ratio : 'first_bid_price * 0.65' }, 
            { add_bid : 'sum(add_bid(0:8))', ratio : 'first_bid_price * 0.60' }, 
            { add_bid : 'sum(add_bid(0:9))', ratio : 'first_bid_price * 0.55' }, 
        ] ,
    },
    max_slot_cnt : 10,
    slots : [ 
        { 
            index : 0, 
            bid_balance_krw : 50000, 
            bid_price : 6300, 
            bid_amount : "bid_balance_krw/bid_price", 
            bid_done_amount : 00, 
            bid_wait_amount : 00,  
        },
        { 
            index : 1, 
            bid_balance_krw : 200000, 
            bid_price : 6200, 
            bid_amount : "bid_balance_krw/bid_price", 
            bid_done_amount : 00, 
            bid_wait_amount : 00 
        },
    ]
}


/*
전체 계좌 조회 : 보유 원화, 토큰에 대한 잔고 및 lock 수량, 평단가 제공.
*/
async function smart_coin_trader()
{
    let current = 0;
    let previous = new Date();
    let elapsed = 0;
    while(1)
    {
        //sleep.sleep(10);
        current = new Date();
        elapsed = (current - previous)/1000;
        if(elapsed > 2)
        {
            console.log("2sec priodic routine....");
            let priceinfo = await upbit.getCurrentPriceInfo("KRW-EOS");
            previous = current;
        }
    }
}


//upbit.getCurrentPriceInfo("KRW-EOS");
smart_coin_trader();

module.exports = 
{ 
};
