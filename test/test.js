/**
 * Created by uzysjung on 2016. 3. 16..
 */

"use strict";

//Load modules

const Lab = require('lab');
const Code = require('code');
const QCPool = require('../index');
const co = require('co');

//Declare internals

const internals = {};

//Test shortcuts
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

var test_qc_url = 'yourserver_url';
describe('QCPool', function() {
    it('set instance option', function(done) {
        const qcPool = new QCPool({min: 5,max:10,idleTimeoutMillis:30000,name:"test"},test_qc_url,'','');
        expect(qcPool.pool._factory).to.contains({min: 5,max:10,idleTimeoutMillis:30000,name:"test"});
        done();

    });
    it('get query array result ', function(done) {
        const qcPool = new QCPool({min: 5,max:10,idleTimeoutMillis:30000,name:"test"},test_qc_url,'','');
        co(function*(){

            try {
                //get QCConnection from pool
                let connection = yield qcPool.acquire();
                let sql = "select UID from recopick.item2user where SERVICE_ID='204' and ACTION_ITEM_KEY='order:1393506544' order by TIMESTAMP asc limit 10";
                var result = yield qcPool.query(connection,sql);
            } catch(e) {
                console.log("error occurred :",e);
            }
            expect(result).to.be.an.array();
            expect(result).to.deep.have.array();

            done();

        });

    });
    it('get query dictionary result ', function(done) {
        const qcPool = new QCPool({min: 5,max:10,idleTimeoutMillis:30000,name:"test"},test_qc_url,'','');
        co(function*(){

            try {
                //get QCConnection from pool
                let connection = yield qcPool.acquire();
                let sql = "select UID from recopick.item2user where SERVICE_ID='204' and ACTION_ITEM_KEY='order:1393506544' order by TIMESTAMP asc limit 10";
                var result = yield qcPool.query(connection,sql,{rowResultType:"Dictionary"});

            } catch(e) {
                console.log("error occurred :",e);
            }
            expect(result).to.be.an.array();

            expect(result[0]).to.include('UID');


            done();

        });

    });

    it('instance creation error ', function(done) {

        const qcPool = new QCPool({min: 5,max:10,idleTimeoutMillis:30000,name:"test"},'jdbc:daas-phoenix://errorurl','','');

        co(function*(){

            try {
                //get QCConnection from pool
                let connection = yield qcPool.acquire();
                let sql = "select UID from recopick.item2user where SERVICE_ID='204' and ACTION_ITEM_KEY='order:1393506544' order by TIMESTAMP asc limit 10";
                var result = yield qcPool.query(connection,sql,{rowResultType:"Dictionary"});

            } catch(e) {
                expect(e).to.include('code');
                expect(e).to.include('errno');
            }
            done();

        });

    });
    it('get qcPool property ', function(done) {

        const qcPool = new QCPool({min: 5,max:10,idleTimeoutMillis:30000,name:"test"},test_qc_url,'','');

        co(function*(){

            try {
                //get QCConnection from pool
                let availableConnectionsCount = qcPool.getAvailableConnectionsCount();
                expect(availableConnectionsCount).to.include(5);
                let maxPoolSize = qcPool.getMaxPoolSize();
                expect(maxPoolSize).to.include(10);
                let qcName =qcPool.getName();
                expect(qcName).to.include('test');
                let qcPoolSize = qcPool.getPoolSize();
                expect(qcPoolSize).to.be.a.number();
            } catch(e) {
            }
            done();

        });

    });
});

