/**
 * Created by uzysjung on 2016. 3. 16..
 */
'use strict';

const qcClient = require('qc-client');
const Pool = require('generic-pool').Pool;
const co = require('co');
const _  = require('underscore');
const internals = {};

exports = module.exports = internals.qcPool = function(option,url,id,pass) {

    var property = {
        name     : 'QueryCache',
        create   : function(callback) {
            co( function*(){
                try {
                    var qc = new qcClient();
                    var connected =  yield qc.open(url, id, pass);

                } catch(e) {
                    callback(e);
                }
                if(connected) {
                    callback(null,qc);
                } else {
                    callback(new Error("qc is not connected"));
                }
            });
        },
        destroy  : function(connection) {
            //console.log("QC Pool destroy called");
            connection.close();
        },
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000
    };
    property =_.extend(property,option);
    this.pool = new Pool(property);
};

internals.qcPool.prototype.acquire = function() {
    const self = this;
    return new Promise(function(resolve,reject){

        self.pool.acquire(function(err,connection){
            if(err) reject(err);
            resolve(connection);
        });
    });
};

//terminate all the resources in the pool
internals.qcPool.prototype.drain = function() {
    this.pool.destroyAllNow();
};

internals.qcPool.prototype.getPoolSize = function(){
    return this.pool.getPoolSize();
};

internals.qcPool.prototype.getName = function(){
    return this.pool.getName();
};
internals.qcPool.prototype.getAvailableConnectionsCount = function() {
    return this.pool.availableObjectsCount();
};

internals.qcPool.prototype.getWaitingClientsCount = function() {
    return this.pool.waitingClientsCount();
};

internals.qcPool.prototype.getMaxPoolSize= function() {
    return this.pool.getMaxPoolSize();
};

internals.qcPool.prototype.query = function(connection,sql,option) {
    var self = this;
    return new Promise(function(resolve,reject){
        co(function*(){
            let results = [];
            let stmt = connection.createStatement();
            let hasResultSet = yield stmt.execute(sql);
            if (!hasResultSet) {
                throw new Error("query affected " + stmt.updateRowCount + " rows.");
            }

            let resultSet = yield stmt.getResultSet();
            if (resultSet == null) {
                throw new Error("query has no result set. (BUG?)");
            }

            let rows = 0;
            for(;;) {
                const nextRowAvailable = yield resultSet.next();
                if (nextRowAvailable) {
                    rows++;
                    if(option && option.rowResultType == "Dictionary")
                        results.push(resultSet.getRowDict());
                    else
                        results.push(resultSet.getRowArray());
                }
                else {
                    break;
                }
            }

            if (resultSet) {
                yield resultSet.close();
            }
            if (stmt) {
                yield stmt.close();
            }
            self.pool.release(connection);
            resolve(results);

        }).catch(function(e){
            self.pool.release(connection);
            reject(e);
        });
    });
};