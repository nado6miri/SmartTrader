exports = module.exports = function(params)
{
    //console.log("#############params = ", params)
    let modulepath = "../config/" + params.userid + "/upbit_configuration";
    //console.log("#############modulepath = ", modulepath)
    const upbit = require(modulepath);
    //console.log("require file = ", modulepath)
    return upbit;
}