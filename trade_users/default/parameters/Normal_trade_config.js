
// Normal Simulation Mode
var NSimulation_Mode = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_BidAsk_KrwCoin: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
    //    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
    //    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addBidAsk_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_BidAsk_Ratio: 1.5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_BidAsk_Ratio_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -1.0,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio: -18,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 3,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8300,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}

// EOS_Small_Gap mode : ȸ���� ���̱� ���� �ּ� margin ����
var EOS_Small_Gap1 = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_BidAsk_KrwCoin: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addBidAsk_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_BidAsk_Ratio: 1.5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_BidAsk_Ratio_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -1.0,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio: -18,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8300,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}

var EOS_Small_Gap2 = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_BidAsk_KrwCoin: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
    //    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
    //    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addBidAsk_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_BidAsk_Ratio: 1.5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_BidAsk_Ratio_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -1.0,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio: -18,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 3,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8300,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// EOS_Middle_Gap : ȸ������ ���̱⿡ ������ ����. Ⱦ�����̳� �������� ���� ���� �����̴� Case
var EOS_Middle_Gap1 = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_BidAsk_KrwCoin: [400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
    //    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
    //    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addBidAsk_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_BidAsk_Ratio: 2.0,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_BidAsk_Ratio_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -4.0,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio: -20,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8300,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// EOS_Middle_Gap : ȸ������ ���̱⿡ ������ ����. Ⱦ�����̳� �������� ���� ���� �����̴� Case
var EOS_Middle_Gap2 = {
    trade_mode: 'normal',
    control_mode: 'run',  // run / stop
    simulation: true,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_BidAsk_KrwCoin: [400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
    //    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
    //    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addBidAsk_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_BidAsk_Ratio: 2.0,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_BidAsk_Ratio_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -4.0,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio: -20,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addBidAsk_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 3,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8300,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}





var params = [
    NSimulation_Mode,      // INDEX 0
    EOS_Small_Gap1,             // INDEX 1
    EOS_Small_Gap2,             // INDEX 2
    EOS_Middle_Gap1,        // INDEX 3
    EOS_Middle_Gap2,        // INDEX 4
];

module.exports = {
    params,             // Config Array....
};
