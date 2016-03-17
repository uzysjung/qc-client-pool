# qc-client-pool
Pool Querycache connections for Node.js

## Installation

```
$ npm install qc-client-pool
```
## Examples

```js
const QCPool = require("../index");
const co = require('co');
const qcPool = new QCPool({min: 5,max:10},'your_server','','');
co(function*(){

    try {
        //get QCConnection from pool
        let connection = yield qcPool.acquire();
        let sql = "select * from table limit 5";

        var result = yield qcPool.query(connection,sql);
        console.log("result Array:",result);

        connection = yield qcPool.acquire();
        sql = "select * from table limit 5";

        result = yield qcPool.query(connection,sql,{rowResultType:"Dictionary"});
        console.log("result Dictionary:",result);

    } catch(e) {
        console.log("error occurred :",e);
    }

    console.log("PoolSize : ",qcPool.getPoolSize());
    console.log("MaxPoolsize : ",qcPool.getMaxPoolSize());

});
```

## License

  MIT