## mysql执行优化
### 开启慢查询日志

### on duplicate key update

### 执行计划各列的显示含义
id              select唯一标识
select_type     select类型
table           表名称
partitions      匹配的分区
type            连接类型
possible_keys   可能的索引选择
key             实际用到的索引
key_len         实际索引长度
ref             与索引比较的列
rows            预计要检查的行数
filtered        按表条件过滤的行百分比
extra           附加信息

### 索引失效
sql语句没有走索引，排除没有建立索引之外，最大的可能性就是索引失效了
不满足最左前缀原则
范围索引列没有放到最后
使用了select *
索引列上有计算
索引列上使用了函数
字符类型没有加引号
用is null和is not null没注意字段是否允许为空
like查询左边有%
使用or关键字时没有注意

### show processlist
查看当前线程执行情况，可以从执行结果中看出,如果发现异常的sql，可以kill掉，确保数据库不会出现严重的问题
id      线程id
user    执行sql的用户
host    执行sql的ip和端口
db      数据库
command 执行命令，包括：daemon、query、sleep
time    执行消耗时间
state   执行状态，
info    执行信息，里面可能包含SQL信息

