const authkey = require("../config/" + "sungbin.na" + "/upbit_configuration");
const upbit = require("../javascripts/upbit_restapi");
//upbit.debug = true;
upbit.get_accountbalance(authkey);
//upbit.get_chance('KRW-EOS').then((data) => { console.log(JSON.stringify(data))});
//upbit.get_chance('KRW-XRP').then((data) => { console.log(JSON.stringify(data))});

//upbit.get_orderslist('KRW-EOS', 'done', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderslist('KRW-EOS', 'wait', 1, 'desc');  // param wait / done / cancel
//upbit.get_orderinfo("b3d4069a-5a63-4b43-bff0-05d37a420831").then((data) => { console.log(JSON.stringify(data))});
//upbit.input_orders('KRW-EOS', 'ask', 1, 9300, 'limit').then((data) => { console.log(JSON.stringify(data))});
//upbit.input_orders('KRW-EOS', 'bid', 0, 3000, 'limit').then((data) => { console.log(JSON.stringify(data))});
//upbit.input_orders('KRW-XRP', 'bid', 1, 400, 'limit').then((data) => { console.log(JSON.stringify(data))});
//upbit.cancel_orders("d9e80d01-2054-4a9b-bb18-1931b2daec58");

//upbit.getMarketCodeList();
//upbit.getCandleData("KRW-EOD", "MIN", 240, 200);  // 분봉
//upbit.getCandleData("KRW-EOS", "DAY");  // 일봉
//upbit.getCandleData("KRW-EOS", "WEEK");  // 주봉
//upbit.getCandleData("KRW-EOS", "MONTH");  // 월봉
//upbit.getTodayTransactionList("KRW-EOS");
//upbit.getCurrentPriceInfo("KRW-EOS");
//upbit.getOrderBookInfo("KRW-EOS");

async function test()
{
    let elapsed = 0, previous = 0;
    // 3. create the first slot
    while (1)
    {
        current = new Date();
        elapsed = (current - previous) / 1000;

        if (elapsed > 3)
        {
            let priceinfo = {};
            previous = current;
            console.log("10 sec priodic routine....");
            let cur_price = await upbit.getCurrentPriceInfo("KRW-EOS");
            priceinfo = cur_price[0];
            console.log("[Price] = ", JSON.stringify(priceinfo), "\n");

            // 잔고 Check후 input order
            let balance = await upbit.get_chance("KRW-EOS");
            console.log("Get_Chance = ", JSON.stringify(balance));


            //let orderinfo = await upbit.input_orders("KRW-EOS", 'ask', 0.1, 8000, 'limit');
            //console.log("orderinfo = ", JSON.stringify(orderinfo));

        }
    }
}


//test();

