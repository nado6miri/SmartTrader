
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
    max_addbid_cnt: 10,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_ask_rate: 6,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: 0, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -7,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: 0, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 0,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8200,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 100000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}

// EOS_Small_Gap mode : ȸ���� ���̱� ���� �ּ� margin ����
var EOS_Small_Gap = {
    trade_mode: 'normal',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [100, 200, 200, 200, 200, 200, 200, 200, 200, 200],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_ask_rate: 1.5,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -3,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -15,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 0,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8200,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


// EOS_Middle_Gap : ȸ������ ���̱⿡ ������ ����. Ⱦ�����̳� �������� ���� ���� �����̴� Case
var EOS_Middle_Gap = {
    trade_mode: 'normal',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [200, 400, 400, 400, 400, 400, 400, 400, 400, 400],
//    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
//    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 30,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_ask_rate: 3,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -6,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -20,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8200,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}



// EOS_Big_Gap : ���� Bull�� �Ǵ� �����忡�� �����ϱ� ���� Case
var EOS_Big_Gap = {
    trade_mode: 'normal',
    control_mode: 'stop',  // run / stop
    simulation: false,
    real_test_mode: false,
    check_period: 15,           //* The price check duration of main loop, unit is second. (unit : Sec)
    slot_Bid_KRW: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
    //    slot_1st_Bid_KRW: 50000,   //* fisrt investment moeny (unit : KRW)
    //    slot_2nd_Bid_KRW: 100000,  //* after 1st slot, investment moeny (unit : KRW)
    max_slot_cnt: 100,          //* The limitation number of creating slots (unit : EA) 
    max_addbid_cnt: 4,        //* The max count of additional purchase crypto currency to lower average price on each slot. (slot�� ��Ÿ�� �ִ� ȸ��)
    target_ask_rate: 2,            //* The ratio of liquidation margin in each slot. (unit : %)
    target_ask_rate_adj: 0.1,        //* The adjustment ratio of target_rate
    new_slot_Create_Ratio: -4,       //* The gap of last transaction price to create new slot. (unit : %, always minus value)
    new_slot_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_slot_crcond. (unit : %, always minus value)
    new_addbid_Create_Ratio: -10,       //* The gap of last transaction price to create new add_bid. (unit : %, always minus value)
    new_addbid_Create_Ratio_adj: -0.1, //* The adjustment ratio of new_addbid_crcond. (unit : %, always minus value)
    restart_flag: 2,            // if flag != 0, set last_bidask_price = current price to restart trader when slot is empty.
    restart_base_price: 8200,            // ���� ��ܰ� ���� (��� 3 �̻��϶� ����)
    limit_invest_coin: 0000,    // The limitation of invest coin in current market. (unit : EA)
    limit_invest_KRW: 10000000,    // The limitation of invest money in current market. (unit : KRW)
    minimum_order_KRW: 500,
    minimum_order_coin: 0.1,    // KRW 500 / Current price = minimum_order_coin
}


var params = [
    NSimulation_Mode,      // INDEX 0
    EOS_Small_Gap,             // INDEX 1
    EOS_Middle_Gap,            // INDEX 2
    EOS_Big_Gap,               // INDEX 3
];

module.exports = {
    params,             // Config Array....
};
