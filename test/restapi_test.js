const upbit = require("../javascripts/upbit_restapi");
upbit.debug = true;
//upbit.get_accountbalance();
upbit.get_chance('KRW-EOS').then((data) => { console.log(JSON.stringify(data))});
upbit.get_chance('KRW-XRP').then((data) => { console.log(JSON.stringify(data))});

//upbit.get_orderslist('KRW-EOS', 'done', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderslist('KRW-EOS', 'wait', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderinfo("9d59aacb-7184-42e4-a78e-3b49beb041b4").then((data) => { console.log(JSON.stringify(data))});
//upbit.input_orders('KRW-EOS', 'ask', 1, 9300, 'limit').then((data) => { console.log(JSON.stringify(data))});
//upbit.input_orders('KRW-EOS', 'bid', 0, 3000, 'limit').then((data) => { console.log(JSON.stringify(data))});
upbit.input_orders('KRW-XRP', 'bid', 1, 400, 'limit').then((data) => { console.log(JSON.stringify(data))});
//upbit.cancel_orders("d9e80d01-2054-4a9b-bb18-1931b2daec58");

//upbit.getMarketCodeList();
//upbit.getCandleData("KRW-EOD", "MIN", 240, 200);  // 분봉
//upbit.getCandleData("KRW-EOS", "DAY");  // 일봉
//upbit.getCandleData("KRW-EOS", "WEEK");  // 주봉
//upbit.getCandleData("KRW-EOS", "MONTH");  // 월봉
//upbit.getTodayTransactionList("KRW-EOS");
//upbit.getCurrentPriceInfo("KRW-EOS");
//upbit.getOrderBookInfo("KRW-EOS");