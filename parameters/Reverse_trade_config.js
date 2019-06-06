// reverse mode
var RSimulation_Mode = {
    trade_mode: 'reverse',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Ask_Coin : [ 20, 60, 60, 60, 60, 60, 60, 60, 60, 60 ],
//    slot_1st_Ask_Coin: 50,   //* fisrt investment coint (unit : EA)
//    slot_2nd_Ask_Coin: 100,  //* after 1st slot, investment coin (unit : EA)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addask_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_bid_rate: 2,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj: 0.5,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: 5,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio: 10,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 0,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 1000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// EOS_Small_Gap 
var EOS_Small_Gap = {
    trade_mode: 'reverse',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Ask_Coin: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    //    slot_1st_Ask_Coin: 50,   //* fisrt investment coint (unit : EA)
    //    slot_2nd_Ask_Coin: 100,  //* after 1st slot, investment coin (unit : EA)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addask_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_bid_rate: 0.5,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: 1,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio: 5,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 1000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// Reverse Mode 2 : 횡보 - gap을 작게.....
var EOS_Middle_Gap = {
    trade_mode: 'reverse',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Ask_Coin: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
//    slot_1st_Ask_Coin: 50,   //* fisrt investment coint (unit : EA)
//    slot_2nd_Ask_Coin: 100,  //* after 1st slot, investment coin (unit : EA)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addask_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_bid_rate: 1,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: 1.5,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio: 7.5,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 1000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}



// EOS_Big_Gap : 강세장 또는 대 폭락장 대응
var EOS_Big_Gap = {
    trade_mode: 'reverse',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Ask_Coin: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    //    slot_1st_Ask_Coin: 50,   //* fisrt investment coint (unit : EA)
    //    slot_2nd_Ask_Coin: 100,  //* after 1st slot, investment coin (unit : EA)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addask_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_bid_rate: 1,            //* The ratio of reverse liquidation margin in each slot. (unit : %)
    target_bid_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: 4,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addask_Create_Ratio: 10,       //* The gap of last transaction price to create new add_ask. (unit : %, always minus value)
    new_addask_Create_Ratio_adj: 0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 1000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}



var params = [
    RSimulation_Mode,       // INDEX 0
    EOS_Small_Gap,          // INDEX 1
    EOS_Middle_Gap,         // INDEX 2
    EOS_Big_Gap,            // INDEX 3
];


module.exports = {
    params, 
};
