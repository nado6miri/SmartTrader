
// Normal Simulation Mode
var NSimulation_Mode = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [50,60,70,80,90,100,110,120,130,140],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 10,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_ask_rate: 6,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -7,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 0,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 100000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}

// normal mode 1
var NMode1 = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_ask_rate: 6,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -5,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -10,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 0,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// Normal Mode 2 : 회전율을 높이기에 적합한 세팅. 횡보장이나 변동폭이 좁게 자주 움직이는 Case
var NMode2 = {
    trade_mode: 'normal',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 3,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot당 물타기 최대 회수)
    target_ask_rate: 1,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -1.5,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -8,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}



var params = [
    NSimulation_Mode,   // INDEX 0
    NMode1,             // INDEX 1
    NMode2,             // INDEX 2
    NMode2,             // INDEX 3
    NMode2,             // INDEX 4
    NSimulation_Mode,   // INDEX 5
];

module.exports = {
    params,             // Config Array....
};
