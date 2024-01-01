## Mongodb学习日记

### Mongodb概念解析



#### mongodb与mysql在一些概念上的对比

| mysql概念   | mongodb概念 | 解释                         |
| ----------- | ----------- | ---------------------------- |
| database    | database    | 数据库                       |
| table       | collection  | 表/集合                      |
| row         | document    | 记录行/文档                  |
| column      | field       | 列/字段                      |
| index       | index       | 索引                         |
| table joins |             | 表连接/不支持                |
| primary key | primary key | 主键/自动将_id字段设置为主键 |



#### 一些简单的命令操作

```sql
#查看所有的数据库
>	shows dbs

#切换数据库
>	use test

#MongoDB连接命令
>	mongodb://admin:123456@host/test

##数据库相关
创建数据库/对象
>	db.runoob.insert({"name":"clsld"})
删除数据库
>	db.dropDatabase()

##集合相关
创建集合,name为要创建的集合名称，options为可选参数，可以指定有关内存大小及索引的选项
>	db.createCollection(name,options)
>	db.createCollection("test",{capped:true,autoIndex:true,size:6142800,max:10000})
在Mongodb中其实并不需要创建集合，当插入一些文档时，mongo就会自动创建
>	db.mycol2.insert("name":"test")
删除集合
>	db.collection.drop()
>	db.mycol2.drop()

##文档相关
插入文档
mongo使用insert()或者save()方法向集合中插入文档
>	db.COLLECTION_NAME.insert(document)
>	db.COLLECTION_NAME.save(document)
1、save：如果_id存在则更新数据，如果不存在就插入数据，可以用db.collection.insertOne()或db.collection.replaceOne()代替
2、insert：偌插入的主键已存在会抛异常

更新文档
>	db.collection.update(<query>,<update>,{
	upset:<boolean>,
	multi:<boolean>,
  writeConcern:<document>
})
query:update的查询语句，类似sql update 查询内where后面的参数
update:update的对象和一些更新的操作符（如$,$inc...）等，也可以理解为sql update查询内set的参数
upsert:可选，参数意思是如果不存在update记录，是否插入objNew,true为插入，默认是false,不插入
multi:可选，mongodb默认是false,只更新找到的第一条记录，如果这个参数为true，就把按条件查出来多条记录全部更新
writeConcern:可选，抛出异常的级别
>	db.col.update(
  {'title':'MongoDB 教程'},
  {$set:{'title':'MongoDB'}})
	WriteResult(
    { 
    	"nMatched" : 1,
    	"nUpserted" : 0, 
    	"nModified" : 1 
    }
  )   # 输出信息
> db.col.find().pretty()#查看替换后的数据
>	db.col.update({"count":{$gt:1}},{$set:{"test":"OK"}}); #只更新第一条记录
> db.col.update({"count":{$gt:3}},{$set:{"test2":"OK"}},false,true); #全部更新
> db.col.update({"count":{$gt:4}},{$set:{"test":"OK"}},true,false); #只添加第一条
> db.col.update({"count":{$gt:5}},{$set:{"test5":"OK"}},true,true);	#全部添加进去
> db.col.update({"count":{$gt:15}},{$inc:{"count":1}},false,true);	#全部更新
> db.col.update({"count":{$gt:10}},{$inc:{"count":1}},false,false);	#只更新第一条记录

删除文档
> db.collection.remove(<query>,<justOne>)
>	db.collection.remove(<query>,{justOne:<boolean>,writeConcern:<document>})
query:删除文档的条件
justOne:如果设为true或1,则删除一个文档，如果不设置该参数，或使用默认值false，则删除所有匹配条件的文档
writeConcern:抛出异常的级别
> db.col.remove({"title":"MongoDB教程"})

查询文档
> db.collection.find(query,projection)
query:使用查询操作符指定查询条件
projectino:使用投影操作符指定返回的键，查询是返回文档中所有键值，只需省略改参数即可
> db.col.find().pretty()
如果你需要易读的方式读取数据，可以使用pretty方法，pretty()方法以格式化的方式来显示所有文档
>	db.col.find({key:value,key1:value1}).pretty()	#and
> db.col.find($or:[{key:value},{key1:value1}]).pretty()	#or
>	db.col.find({"likes":{$gt:50},$or:[{"by":"VAN"},{"title":"monfo"}]}).pretty() # and & or 联合使用


#创建索引
> db.collection,createIndex(keys,options)
语法中，key值为你要创建的索引字段，1为指定按升序创建索引，如果你想按降序来创建索引指定为-1即可
> db.col.createIndex({"title":1,"description":-1})

#聚合操作
> db.COLLECTION_NAME.aggregate(AGGREGATE_OPERATION)

```



#### MongoDB的数据结构

> String	字符串
>
> Integer	整数数值
>
> Boolean	布尔值
>
> Double	双精度浮点值
>
> Min/Max keys	将一个值与BSON(二进制的Json)元素的最低值和最高值相对比
>
> Array	用于将数组或者列表或者多个值存储为一个键
>
> TImestamp	时间戳
>
> Object	用于内嵌文档
>
> Null	用于创建空值
>
> Symbol	符号，该数据类型基本等同于字符串类型
>
> Date	日期时间
>
> Object ID	对象ID
>
> Binary Data	二进制数据
>
> Code	代码类型
>
> Regular expression	正则表达式



#### MongoDB与sql的where语句比较

| 操作       | 格式               | 范例                                      | sql中类似的语句       |
| ---------- | ------------------ | ----------------------------------------- | --------------------- |
| 等于       | {key:value}        | db.col.find({"by":"菜鸟教程"}).pretty()   | where by = "菜鸟教程" |
| 小于       | {key:{$lt:value}}  | db.col.find({"likes":{$lt:50}}).pretty()  | where likes < 50      |
| 小于或等于 | {key:{$lte:value}} | db.col.find({"likes":{$lte:50}}).pretty() | where likes <= 50     |
| 大于       | {key:{$gt:value}}  | db.col.find({"likes":{$gt:50}}).pretty()  | where likes > 50      |
| 大于或等于 | {key:{$gte:value}} | db.col.find({"lieks":{$gte:50}}).pretty() |                       |
| 不等于     | {key:{$ne:value}}  | db.col.find({"likes":{$ne:50}}).pretty()  | where likes != 50     |



#### MongoDB聚合表达式

| 表达式    | 描述                                                         | 实例                                                         |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| $sum      | 计算总和                                                     | db.mycol.aggregate([{$group : {_id : "$by_user", num_tutorial : {$sum : "$likes"}}}]) |
| $avg      | 计算平均值                                                   | db.mycol.aggregate([{$group : {_id : "$by_user", num_tutorial : {$avg : "$likes"}}}]) |
| $min      | 获取集合中所有文档对应值的最小值                             | db.mycol.aggregate([{$group : {_id : "$by_user", num_tutorial : {$min : "$likes"}}}]) |
| $max      | 获取集合中所有文档对应值的最大值                             | db.mycol.aggregate([{$group : {_id : "$by_user", num_tutorial : {$max : "$likes"}}}]) |
| $push     | 将值加入一个数组中，不会判断是否有重复的值                   | db.mycol.aggregate([{$group : {_id : "$by_user", url : {$push: "$url"}}}]) |
| $addToSet | 将值加入一个数组中，会判断是否有重复的值，若相同的值在数组中已经存在了，则不加入 | db.mycol.aggregate([{$group : {_id : "$by_user", url : {$addToSet : "$url"}}}]) |
| $first    | 根据资源文档的排序获取第一个文档数据                         | db.mycol.aggregate([{$group : {_id : "$by_user", first_url : {$first : "$url"}}}]) |
| $last     | 根据资源文档的排序获取最后一个文档数据                       | db.mycol.aggregate([{$group : {_id : "$by_user", last_url : {$last : "$url"}}}]] |

#### MongoDB复制原理

mongodb的复制至少需要两个节点。其中一个是主节点，负责处理客户端请求，其余的都是从节点，负责复制主节点上的数据。

mongodb各个节点常见的搭配方式为：一主一从、一主多从。

主节点记录在其上的所有操作oplog，从节点定期轮询主节点获取这些操作，然后对自己的数据副本执行这些操作，从而保证从节点的数据与主节点一致。