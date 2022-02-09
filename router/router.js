const express = require('express')
const con = require('../modul/db.js')
const moment = require('moment');
const router = express.Router()

let db= con.handleDisconnection()

// 处理数据的函数
// data 数据
// root 顶级数据
let getChildren = function (data, root) {
  var children = [];
  for (var i = 0; i < data.length; i++) {
    if (root == data[i].super) {
      data[i].children = getChildren(data, data[i].id);
      children.push(data[i]);
    }
  }
  return children;
}

function query(conn, sql, params = []) {
    if (!conn) {
        return;
    }
    return new Promise(function (resolve, reject) {
        conn.query(sql, params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

// "select account,password from user where account = '"+req.query.account+"' and password = '"+req.query.password+"'";
//登录

router.get('/login', (req, res) => {
    let name = req.query.username
    let pwd = req.query.password
    let sql2 = `select name,phone,token,id from user where phone = "${name}" and password = "${pwd}"`
    let sql1 = `UPDATE user SET token='${new Date().getTime().toString()}' WHERE phone="${name}"`
    //开启一个事务
    db.beginTransaction(function (err) {
        if (err) {
            throw err;
        }
        db.query(sql1, ['A'], function (err, data) {
            if (err) {
                //如果有错误则回滚
                res.json({
                  code: 1,
                  msg: err
                })
                return db.rollback(function () {
                    throw err;
                });
            }
            db.query(sql2, ['B'], function (err, data) {
                if (err) {
                    //如果有错误则回滚
                    res.json({
                      code: 1,
                      msg: err
                    })
                    return db.rollback(function () {
                        throw err;
                    });
                }
                //提交事务
                db.commit(function (err,results) {
                         if (err) {
                          res.json({
                            code: 1,
                            msg: err
                          })
                          return db.rollback(function () {
                            throw err;
                        });
                        } 
                        if (data.length === 0) {
                            res.json({
                                code: 1,
                                msg: '账户密码错误'
                              })
                          } else {
                            res.json({
                              code: 200,
                              data: data
                            })
                          }
                });
            });
        });
      });
})
///////////////////////店员管理//////////////////////////////
//店员列表
router.get('/userlist', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let sql_ = ''
    if(req.query.name !== ''){
        if(sql_ == ''){
            sql_ += `where name like '%${req.query.name}%'`
        } else {
            sql_ += `and name like '%${req.query.name}%'`
        }
    }
    if(req.query.phone !== ''){
        if(sql_ == ''){
            sql_ += `where phone = "${req.query.phone}"`
        } else {
            sql_ += `and phone = "${req.query.phone}"`
        }
    }
    let start = (req.query.pages - 1 ) * req.query.pagesize;
    let end = req.query.pages * req.query.pagesize;
    // let sql = `select phone,name,date,id from user ${sql_} limit ${start} , ${end}`
    let sql = `select a.*,b.* from 
    (select count(1) datacount from user  ${sql_}) a,
    (select phone,name,date,id from user sga ${sql_} order by id desc limit ${start},${end}) b
    ;`
    db.query({
      sql: sql
    }, (err, results, fields) => {
        if (err) {
            res.json({
                code: 1,
                msg: err
              })
          } else {
            res.json({
              code: 200,
              data: { data_list: results, datacount: results.length > 0 ? results[0].datacount : 0},
              sql: sql
            })
          }
    })
    })();
    
})
//店员增加
router.get('/addUser', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        let userStart = await query(db, `select name,phone,token from user where phone = "${req.query.phone}"`);
        if(userStart.length !== 0){
            res.json({
                code: 1,
                msg: '手机号重复！'
            })
            return
        }
        /////
        let name = req.query.name
        let phone = req.query.phone
        let sql = `INSERT INTO user (name,phone,date,password) values ('${name}','${phone}','${moment().format("YYYY-MM-DD HH:mm:ss")}','123456')`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    id: results.insertId
                })
                }
        })
    })();
})
//店员个人查询
router.post('/userInfor', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `select phone,name,date,id from user where id = "${body.id}"`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: results.length > 0 ? results[0] : {},
                    sql: sql
                })
                }
        })
    })();
})

//修改店员个人信息
router.post('/useredit', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE user SET name='${body.name}',phone='${body.phone}' WHERE id=${body.id}`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: results.insertId,
                    sql: sql
                })
                }
        })
    })();
})

// 删除店员
router.post('/userdel', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `DELETE FROM user WHERE id = '${body.id}'`
        db.query(sql, (err, results, fields) => {
            if (err) {
            console.log(err)
            } else {
            res.json({
                code: 200,
                data: '删除成功',
                sql: sql
            })
            }
        })
    })();
})

//重置密码
router.post('/passwordreset', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE user SET password='123456' WHERE id=${body.id}`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: results.insertId,
                    sql: sql
                })
                }
        })
    })();
})

//修改密码
router.post('/passwordedit', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE user SET password=${body.new} WHERE id=${body.id} and password=${body.old}`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                    if(results.changedRows > 0){
                        res.json({
                            code: 200,
                            data: results,
                            sql: sql
                        })
                    } else{
                        res.json({
                            code: 1,
                            msg: '密码不对',
                            sql: sql
                        })
                    }
                }
        })
    })();
})

///////////////////////会员管理//////////////////////////////

// 会员列表
router.get('/customerlist', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let sum = await query(db, `select c.*,d.* from 
        (select sum(giveAmount) as sumgiveAmount, sum(rechargeAmount) as sumrechargeAmount from rechargerecord) c,
        (select sum(balance) as sumbalance from customer) d
        ;`);
        if(sum.length === 0){
            sum = [{
                sumgiveAmount: 0,
                sumrechargeAmount: 0,
                sumbalance: 0
            }]
        }
        ////////
        let sql_ = ''
        if(req.query.name !== ''){
            if(sql_ == ''){
                sql_ += `where name like '%${req.query.name}%'`
            } else {
                sql_ += `and name like '%${req.query.name}%'`
            }
        }
        if(req.query.phone !== ''){
            if(sql_ == ''){
                sql_ += `where phone = "${req.query.phone}"`
            } else {
                sql_ += `and phone = "${req.query.phone}"`
            }
        }
        if(req.query.date !== ''){
            if(sql_ == ''){
                sql_ += `where date like '%${req.query.date}%'`
            } else {
                sql_ += `and date like '%${req.query.date}%'`
            }
        }
        let start = (req.query.pages - 1 ) * req.query.pagesize;
        let end = req.query.pages * req.query.pagesize;
        // let sql = `select phone,name,date,id from user ${sql_} limit ${start} , ${end}`
        let sql = `select a.*,b.* from 
        (select count(1) datacount from customer  ${sql_}) a,
        (select * from customer  sga ${sql_} order by id desc limit ${start},${end}) b
        ;`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: { data_list: results, datacount: results.length > 0 ? results[0].datacount : 0, sum: sum[0]},
                    sql: sql
                })
                }
        })
    })();
})

//添加会员
router.post('/addCustomer', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        let body = eval ("(" + Object.keys(req.body) + ")")
        let userStart = await query(db, `select phone from customer where phone = "${body.phone}"`);
        if(userStart.length !== 0){
            res.json({
                code: 1,
                msg: '手机号重复！'
            })
            return
        }
        /////
        let no = new Date().getTime().toString().slice(9,12) + moment().format("YYYYMMDDHHmmss")
        
        let date = body.cTime ===  '' ? moment().format("YYYY-MM-DD HH:mm:ss") : body.cTime;
        let sql = `INSERT INTO customer (name,phone,date,no,birthday,source,adds,remarks) values ('${body.name}','${body.phone}','${date}','${no}','${body.birthday}','${body.source}','${body.adds}','${body.remarks}')`
        let sql1 = `INSERT INTO rechargerecord (name) values ('${body.name}')`
        db.query({
          sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                  })
              } else {
                res.json({
                  code: 200,
                  data: results.length > 0 ? results[0] : {},
                  sql: sql
                })
              }
        })
    })();
  })

//会员详情
router.post('/customerInfor', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `select name,phone,date,no,birthday,source,adds,remarks,id,otherBalance,balance from customer where id = "${body.id}"`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: results.length > 0 ? results[0] : {},
                    sql: sql
                })
                }
        })
    })();
})  

//修改会员个人信息
router.post('/customerEdit', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE customer SET name='${body.name}',phone='${body.phone}',birthday='${body.birthday}',source='${body.source}',adds='${body.adds}',remarks='${body.remarks}' WHERE id=${body.id}`
        db.query({
            sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                    })
                } else {
                res.json({
                    code: 200,
                    data: results.insertId,
                    sql: sql
                })
                }
        })
    })();
})

//会员充值
router.post('/customerRecharge', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let date = body.cTime ===  '' ? moment().format("YYYY-MM-DD HH:mm:ss") : body.cTime;
        let otherAmount = Number(body.otherAmount) + Number(body.oldOtherAmount)
        let sql1 = `INSERT INTO rechargerecord (name,phone,no,oldBalance,newBalance,rechargeAmount,otherAmount,date,operator,giveAmount) 
                values ('${body.name}','${body.phone}','${body.no}','${body.oldBalance}','${body.newBalance}','${body.rechargeAmount}','${otherAmount}','${date}','${body.operator}','${body.giveAmount}')`
        let sql2 = `UPDATE customer SET balance='${body.newBalance}',otherBalance='${otherAmount}' WHERE id=${body.id}`
        //开启一个事务
        db.beginTransaction(function (err) {
        if (err) {
            throw err;
        }
        db.query(sql1, ['A'], function (err, data) {
            if (err) {
                //如果有错误则回滚
                res.json({
                    code: 1,
                    msg: err
                })
                return db.rollback(function () {
                    throw err;
                });
            }
            db.query(sql2, ['B'], function (err, data) {
                if (err) {
                    //如果有错误则回滚
                    res.json({
                        code: 1,
                        msg: err
                    })
                    return db.rollback(function () {
                        throw err;
                    });
                }
                //提交事务
                db.commit(function (err,results) {
                        if (err) {
                            res.json({
                            code: 1,
                            msg: err
                            })
                            return db.rollback(function () {
                            throw err;
                        });
                            } 
                                res.json({
                                code: 200,
                                data: results
                                })
                });
            });
        });
        });
    })();
  })

// 会员充值列表
router.get('/rechargeRecordList', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let sql_ = ''
        if(req.query.name !== ''){
            if(sql_ == ''){
                sql_ += `where name like '%${req.query.name}%'`
            } else {
                sql_ += `and name like '%${req.query.name}%'`
            }
        }
        if(req.query.phone !== ''){
            if(sql_ == ''){
                sql_ += `where phone = "${req.query.phone}"`
            } else {
                sql_ += `and phone = "${req.query.phone}"`
            }
        }
        if(req.query.date !== ''){
            if(sql_ == ''){
                sql_ += `where date like '%${req.query.date}%'`
            } else {
                sql_ += `and date like '%${req.query.date}%'`
            }
        }
        let start = (req.query.pages - 1 ) * req.query.pagesize;
        let end = req.query.pages * req.query.pagesize;
        // let sql = `select phone,name,date,id from user ${sql_} limit ${start} , ${end}`
        let sql = `select a.*,b.* from 
        (select count(1) datacount from rechargerecord  ${sql_}) a,
        (select * from rechargerecord  sga ${sql_} order by id desc limit ${start},${end}) b
        ;`
        db.query({
        sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                })
            } else {
                res.json({
                code: 200,
                data: { data_list: results, datacount: results.length > 0 ? results[0].datacount : 0},
                sql: sql
                })
            }
        })
    })();
  })

//非会员消费
router.post('/plainConsumeRecord', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let date = body.date === '' ? moment().format("YYYY-MM-DD HH:mm:ss") :  body.date;
        let sql = `INSERT INTO consumerecord (name,phone,oldBalance,oldOtherBalance,inventory,subTotal,reduceBalance,newOtherBalance,newBalance,buckleBalance,buckleOtherBalance,shouldBalance,date,operator,inventoryList,customerId,no,remarks) 
        values ('${body.name}','${body.phone}','${body.oldBalance}','${body.oldOtherBalance}','${body.inventory}','${body.subTotal}','${body.reduceBalance}','${body.newOtherBalance}','${body.newBalance}','${body.buckleBalance}','${body.buckleOtherBalance}','${body.shouldBalance}','${date}','${body.operator}','${body.inventoryList}','${body.customerId}','${body.no}','${body.remarks}')`
        db.query({
          sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                  })
              } else {
                res.json({
                  code: 200,
                  data: results.length > 0 ? results[0] : {},
                  sql: sql
                })
              }
        })
    })();
  })

//会员消费
router.post('/consumeRecord', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let date = body.date === '' ? moment().format("YYYY-MM-DD HH:mm:ss") :  body.date;
        let sql1 = `INSERT INTO consumerecord (name,phone,oldBalance,oldOtherBalance,inventory,subTotal,reduceBalance,newOtherBalance,newBalance,buckleBalance,buckleOtherBalance,shouldBalance,date,operator,inventoryList,customerId,no,remarks) 
                values ('${body.name}','${body.phone}','${body.oldBalance}','${body.oldOtherBalance}','${body.inventory}','${body.subTotal}','${body.reduceBalance}','${body.newOtherBalance}','${body.newBalance}','${body.buckleBalance}','${body.buckleOtherBalance}','${body.shouldBalance}','${date}','${body.operator}','${body.inventoryList}','${body.customerId}','${body.no}','${body.remarks}')`
        let sql2 = `UPDATE customer SET balance='${body.newBalance}',otherBalance='${body.newOtherBalance}' WHERE id=${body.customerId}`
        //开启一个事务
        db.beginTransaction(function (err) {
        if (err) {
            throw err;
        }
        db.query(sql1, ['A'], function (err, data) {
            if (err) {
                //如果有错误则回滚
                res.json({
                    code: 1,
                    msg: err
                })
                return db.rollback(function () {
                    throw err;
                });
            }
            db.query(sql2, ['B'], function (err, data) {
                if (err) {
                    //如果有错误则回滚
                    res.json({
                        code: 1,
                        msg: err
                    })
                    return db.rollback(function () {
                        throw err;
                    });
                }
                //提交事务
                db.commit(function (err,results) {
                        if (err) {
                            res.json({
                            code: 1,
                            msg: err
                            })
                            return db.rollback(function () {
                            throw err;
                        });
                            } 
                                res.json({
                                code: 200,
                                data: results
                                })
                });
            });
        });
        });
    })();
})

// 会员消费记录
router.get('/consumeRecordList', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let sql_ = ''
        if(req.query.name !== ''){
            if(sql_ == ''){
                sql_ += `where name like '%${req.query.name}%'`
            } else {
                sql_ += `and name like '%${req.query.name}%'`
            }
        }
        if(req.query.phone !== ''){
            if(sql_ == ''){
                sql_ += `where phone = "${req.query.phone}"`
            } else {
                sql_ += `and phone = "${req.query.phone}"`
            }
        }
        if(req.query.date !== ''){
            if(sql_ == ''){
                sql_ += `where date like '%${req.query.date}%'`
            } else {
                sql_ += `and date like '%${req.query.date}%'`
            }
        }
        let start = (req.query.pages - 1 ) * req.query.pagesize;
        let end = req.query.pages * req.query.pagesize;
        // let sql = `select phone,name,date,id from user ${sql_} limit ${start} , ${end}`
        let sql = `select a.*,b.* from 
        (select count(1) datacount from consumerecord  ${sql_}) a,
        (select * from consumerecord  sga ${sql_} order by id desc limit ${start},${end}) b
        ;`
        db.query({
        sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                })
            } else {
                res.json({
                code: 200,
                data: { data_list: results, datacount: results.length > 0 ? results[0].datacount : 0},
                sql: sql
                })
            }
        })
    })();
})

////////////////////////////////产品管理////////////////////////////////////////////////////////

// 产品列表
router.get('/productlist', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let sql_ = ''
        if(req.query.name !== ''){
            if(sql_ == ''){
                sql_ += `where name like '%${req.query.name}%'`
            } else {
                sql_ += `and name like '%${req.query.name}%'`
            }
        }
        if(req.query.no !== ''){
            if(sql_ == ''){
                sql_ += `where no like '%${req.query.no}%'`
            } else {
                sql_ += `and no like '%${req.query.no}%'`
            }
        }
        let start = (req.query.pages - 1 ) * req.query.pagesize;
        let end = req.query.pages * req.query.pagesize;
        // let sql = `select phone,name,date,id from user ${sql_} limit ${start} , ${end}`
        let sql = `select a.*,b.* from
        (select count(1) datacount from product ${sql_}) a,
        (select * from product sga ${sql_} order by topDate desc,editDate desc limit ${start},${end}) b;`
        db.query({
        sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                })
            } else {
                res.json({
                code: 200,
                data: { data_list: results, datacount: results.length > 0 ? results[0].datacount : 0},
                sql: sql
                })
            }
        })
    })();
})

//添加产品
router.post('/addProduct', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }

        let body = eval ("(" + Object.keys(req.body) + ")")
        let productStart = await query(db, `select name from product where name = "${body.name}"`);
        if(productStart.length !== 0){
            res.json({
                code: 1,
                msg: '产品名称重复'
            })
            return
        }
        /////
        let no = 'c' + new Date().getTime().toString().slice(9,12) + moment().format("YYYYMMDDHHmmss")
        let sql = `INSERT INTO product (name,date,no,price,editDate) values ('${body.name}','${moment().format("YYYY-MM-DD HH:mm:ss")}','${no}','${body.price}','${moment().format("YYYY-MM-DD HH:mm:ss")}')`
        
        db.query({
        sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                })
            } else {
                res.json({
                code: 200,
                data: results.length > 0 ? results[0] : {},
                sql: sql
                })
            }
        })
    })();
})

//产品详情
router.post('/productInfor', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `select name,no,id,price from product where id = "${body.id}"`
        db.query({
        sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                })
            } else {
                res.json({
                code: 200,
                data: results.length > 0 ? results[0] : {},
                sql: sql
                })
            }
        })
    })();
})  

//修改产品信息
router.post('/productedit', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE product SET name='${body.name}',price='${body.price}',editDate='${moment().format("YYYY-MM-DD HH:mm:ss")}' WHERE id=${body.id}`
        db.query({
          sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                  })
              } else {
                res.json({
                  code: 200,
                  data: results.insertId,
                  sql: sql
                })
              }
        })
    })();
})

//产品置顶
router.post('/productTop', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `UPDATE product SET topDate=${new Date().getTime().toString()} WHERE id=${body.id}`
        db.query({
          sql: sql
        }, (err, results, fields) => {
            if (err) {
                res.json({
                    code: 1,
                    msg: err
                  })
              } else {
                res.json({
                  code: 200,
                  data: results.insertId,
                  sql: sql
                })
              }
        })
    })();
})

// 删除产品
router.post('/productdel', (req, res) => {
    (async function () {
        let result_ = await query(db, `select name,phone,token from user where token = "${req.headers.token}"`);
        console.log(result_)
        if(result_.length === 0){
            res.json({
                code: 1,
                msg: '登录失效请重新登录'
            })
            return
        }
        /////
        let body = eval ("(" + Object.keys(req.body) + ")")
        let sql = `DELETE FROM product WHERE id = '${body.id}'`
        db.query(sql, (err, results, fields) => {
        if (err) {
            console.log(err)
        } else {
            res.json({
            code: 200,
            data: '删除成功',
            sql: sql
            })
        }
        })
    })();
})



/////////////////////////////////////////////////


// 获取所有部门信息
router.get('/getsection', (req, res) => {
  let sql = `SELECT * FROM section`
  db.query({
    sql: sql
  }, (err, results) => {
    if (err) {
      console.log(err)
    } else {
      res.send(getChildren(results, 0))
    }
  })
})

// 根据部门id请求对应部门员工信息  参数 部门id
router.get('/getstaff', (req, res) => {
  let id = req.query.id
  let sql = `SELECT * FROM staff WHERE staff.seid = '${id}'`
  db.query({
    sql: sql
  }, (err, results, fields) => {
    res.send(results)
  })

})


// 获取岗位信息
router.get('/getpost', (req, res) => {
  let sql = `SELECT * FROM login`
  db.query({
    sql: sql
  }, (err, results, fields) => {
    res.send({data:results,id:'5'})
  })

})

//// 添加数据
router.post('/addstaff', (req, res) => {
  let sql = `INSERT INTO staff (name,sex,birthday,other,seid,poid) values ('${req.body.name}','${req.body.sex}','${req.body.birthday}','${req.body.other}',${req.body.seid},${req.body.poid})`
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err)
    } else {
      res.json({
        code: 200
      })
    }
  })
})

// 搜索员工信息
router.get('/findstaff', (req, res) => {
  let seid = req.query.seid //部门id
  let poid = req.query.poid //岗位id
  let name = req.query.name //员工姓名
  if (poid) {
    sql = `SELECT * FROM staff WHERE staff.poid = '${poid}' AND staff.seid = ${seid} and staff.name LIKE '%${name}%';`
  } else {
    sql = `SELECT * FROM staff WHERE  staff.seid = ${seid} and staff.name LIKE '%${name}%';`
  }
  db.query({
    sql: sql
  }, (err, results, fields) => {
    console.log(results)
    res.send(results)
  })

})

// 删除员工

router.get('/removestaff', (req, res) => {
  let id = req.query.id
  let sql = `DELETE FROM staff WHERE id = '${id}'`
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err)
    } else {
      res.json({
        code: 200
      })
    }
  })
})


// 按员工id获取员工
router.get('/staff_id', (req, res) => {
  let id = req.query.id
  let sql = `SELECT * FROM staff WHERE staff.id = ${id} `
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err)
    } else {
      res.send(result)
    }
  })
})

// 更新 员工信息
router.post('/update', (req, res) => {
  let id = req.body.id,
    sta = req.body,
   
    newSta = [sta.name, sta.sex, sta.birthday, sta.other, sta.seid, sta.poid]
  let sql = `UPDATE staff SET name = ?, sex = ?, birthday = ?, other = ?, seid = ?, poid = ? WHERE id = ${req.body.id}`
  db.query(sql, newSta, (err, result) => {
    if (err) {
      console.log(err)
    } else {
      res.json({
        code: 200
      })
    }
  })
})


module.exports = router