/**
 * Created by uzysjung on 2016. 3. 16..
 */
'use strict';

const qcClient = require('di-qc-client');
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
        validate : function(connection) {

            if(connection.connectionError) {
                console.log('error remove on validate');
                return false;
            }
            return true;
        },
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        queryTimeout : 5000 //5 sec
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
    let fn = co(function*(){
        let resultSet,stmt;
        let results = [];
        try {
            stmt = connection.createStatement();
            let hasResultSet = yield stmt.execute(sql);
            if (!hasResultSet) {
                throw new Error("query affected " + stmt.updateRowCount + " rows.");
            }

            resultSet = yield stmt.getResultSet();
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
        } catch(e) {
            throw e;
        } finally {
        }
        return results;

    });

    function timeout(interval) {
        return new Promise(function (resolve, reject) {
            setTimeout(function(){
                reject(new Error('timeout: exceed ' + interval + 'ms'));
            }, interval || 0);
        })
    };

    return co(function*(){
        let results;
        try {
            results = yield Promise.race([timeout(self.pool._factory.queryTimeout),fn])
        } catch(e){
            connection.connectionError = e;
            console.error('qcPool Query Error',e.stack);
            throw e;
        } finally  {
            self.pool.release(connection);
        }
        return results;

    });
};

internals.qcPool.prototype.queryUpsert = function(connection,sql) {
    var self = this;
    let fn = co(function*(){
        try {
            let stmt = connection.createStatement();
            let hasResultSet = yield stmt.execute(sql);
            let result = yield stmt.setCommit();
            if(stmt) {
                yield stmt.close();
            }

        } catch(e){
            throw e
        } finally {
        }
        return result;
    });
    function timeout(interval) {
        return new Promise(function (resolve, reject) {
            setTimeout(function(){
                reject(new Error('timeout: exceed ' + interval + 'ms'));
            }, interval || 0);
        })
    };
    return co(function*(){
        let result;
        try {
            result = yield Promise.race([timeout(self.pool._factory.queryTimeout),fn])
        } catch (e){
            connection.connectionError = e;
            console.error('qcPool Query Error :',e.stack);
            throw e;
        } finally  {
            self.pool.release(connection);
        }
        return result;
    });
};

