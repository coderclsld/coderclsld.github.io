## Mysql复习

### 一、Mysql事务及特性

是来自下方的连接：

​		[数据库事务与MySQL事务总结](https://zhuanlan.zhihu.com/p/29166694)

​		[一文讲清楚MySQL事务隔离级别和实现原理，开发人员必备知识点](https://www.cnblogs.com/fengzheng/p/12557762.html)

​		[深入学习MySQL事务：ACID特性的实现原理](https://www.cnblogs.com/kismetv/p/10331633.html)

#### MySQL 事务

​		数据库事务指的是一组数据操作，事务内的操作要么就是全部成功，要么就是全部失败，什么都不做，其实不是没做，是可能做了一部分但是只要有一步失败，就要回滚所有操作

​		事务具有原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持久性（Durability）四个特性，简称 `ACID`，缺一不可。

#### 一、逻辑架构和存储引擎

![img](./1174710-20190128200647649-2138221098.png)

> ​		MySQL服务器逻辑架构从上往下可以分为三层：
>
> （1）第一层：处理客户端连接、授权认证等。
>
> （2）第二层：服务器层，负责查询语句的解析、优化、缓存以及内置函数的实现、存储过程等。
>
> （3）第三层：存储引擎，负责MySQL中数据的存储和提取。**MySQL**中服务器层不管理事务，事务是由存储引擎实现的。**MySQL支持事务的存储引擎有InnoDB、NDB Cluster等，其中InnoDB的使用最为广泛；其他存储引擎不支持事务，如MyIsam、Memory等。

#### 二、提交和回滚

​		典型的MySQL事务是如下操作的：

```sql
start transaction;
#一条或多条sql语句
commit;
```

​		start transaction标识事务开始，commit提交事务，将执行结果写入到数据库。如果sql语句执行出现问题，会调用rollback，回滚所有已经执行成功的sql语句。

#### **自动提交**

​		MySQL中默认采用的是自动提交（autocommit）模式:

![img](./1174710-20190128200647649-2138221098.png)

​		在自动提交模式下，如果没有start transaction显式地开始一个事务，那么每个sql语句都会被当做一个事务执行提交操作。

​		通过如下方式，可以关闭autocommit；需要注意的是，autocommit参数是针对连接的，在一个连接中修改了参数，不会对其他连接产生影响。

![img](./1174710-20190128200647649-2138221098.png)

​		如果关闭了autocommit，则所有的sql语句都在一个事务中，直到执行了commit或rollback，该事务结束，同时开始了另外一个事务。

#### **特殊操作**

​		在MySQL中，存在一些特殊的命令，如果在事务中执行了这些命令，会马上强制执行commit提交事务；如DDL语句(create table/drop table/alter/table)、lock tables语句等等。

不过，常用的select、insert、update和delete命令，都不会强制提交事务。

#### 特性

##### 一、隔离性（Isolation）

###### 1. 定义

> ​		**与原子性、持久性侧重于研究事务本身不同，隔离性研究的是不同事务之间的相互影响。**隔离性是指，事务内部的操作与其他事务是隔离的，并发执行的各个事务之间不能互相干扰。严格的隔离性，对应了事务隔离级别中的Serializable (可串行化)，但实际应用中出于性能方面的考虑很少会使用可串行化。
>
> ​		隔离性追求的是并发情形下事务之间互不干扰。简单起见，我们主要考虑最简单的读操作和写操作(加锁读等特殊读操作会特殊说明)，那么隔离性的探讨，主要可以分为两个方面：
>
> - (一个事务)写操作对(另一个事务)写操作的影响：锁机制保证隔离性
> - (一个事务)写操作对(另一个事务)读操作的影响：MVCC保证隔离性

###### 2、概念说明

> ###### 脏读
>
> ​		当前事务(A)中可以读到其他事务(B)未提交的数据（脏数据）。一个事务在执行过程中可以读到其他事务改变了但是没有提交的数据即其他事务没有提交的数据我可以读到。
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201003630-2050662608.png)
>
> ###### 可重复读
>
> ​		可重复读指的是在一个事务内，最开始读到的数据和事务结束前的任意时刻读到的同一批数据都是一致的。通常针对数据**更新（UPDATE）**操作。数据不管在我这个事务开始的时候是什么样子就是什么样子，不管其他事务有没有在执行过程中修改了数据的内容。
>
> ###### 不可重复读
>
> ​		在事务A中先后两次读取同一个数据，两次读取的结果不一样，这种现象称为不可重复读。脏读与不可重复读的区别在于：前者读到的是其他事务未提交的数据，后者读到的是其他事务已提交的数据。即和可重读的区别就是，可重读就算在执行期间有其他事务的提交再次读时得到的还是在此事务开始执行前的值。举例如下：
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201011603-1317894910.png)
>
> ###### 幻读
>
> ​		在事务A中按照某个条件先后两次查询数据库，两次查询结果的条数不同，这种现象称为幻读。不可重复读与幻读的区别可以通俗的理解为：前者是数据变了，后者是数据的行数变了。举例如下：
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201021606-1089980279.png)

###### 3、事务隔离级别

> ​		SQL 标准定义了四种隔离级别，MySQL 全都支持。这四种隔离级别分别是：
>
> 1. `读未提交（READ UNCOMMITTED）`
>
> 2. `读提交 （READ COMMITTED）`
>
> 3. `可重复读 （REPEATABLE READ）`
>
> 4. `串行化 （SERIALIZABLE）`
>
>    ​	从上往下，隔离强度**逐渐增强**，性能逐渐变差。采用哪种隔离级别要根据系统需求权衡决定，其中，**可重复读**是 MySQL 的默认级别。
>
>    ​	事务隔离其实就是为了**解决**上面提到的脏读、不可重复读、幻读这几个问题，下面展示了 4 种隔离级别对这三个问题的解决程度。
>
> | **隔离级别** | **脏读** | **不可重复读** | **幻读** |
> | ------------ | -------- | -------------- | -------- |
> | 读未提交     | 可能     | 可能           | 可能     |
> | 读提交       | 不可能   | 可能           | 可能     |
> | 可重复读     | 不可能   | 不可能         | 可能     |
> | 串行化       | 不可能   | 不可能         | 不可能   |
>
> ​		只有串行化的隔离级别解决了全部这 3 个问题，其他的 3 个隔离级别都有缺陷。
>
> ​		在实际应用中，**读未提交**在并发时会导致很多问题，而性能相对于其他隔离级别提高却很有限，因此使用较少。**可串行化**强制事务串行，并发效率很低，只有当对数据一致性要求极高且可以接受没有并发时使用，因此使用也较少。因此在大多数数据库系统中，默认的隔离级别是**读已提交**(如Oracle)**或**可重复读（后文简称RR）。
>
> ​		可以通过如下两个命令分别查看全局隔离级别和本次会话的隔离级别：
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201103652-719570401.png)![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201111615-210490190.png)
>
> ​		在SQL标准中，RR是无法避免幻读问题的，但是InnoDB实现的RR避免了幻读问题。

###### 4、锁机制

隔离性要求同一时刻只能有一个事务对数据进行写操作，InnoDB通过锁机制来保证这一点。

锁机制的基本原理可以概括为：事务在修改数据之前，需要先获得相应的锁；获得锁之后，事务便可以修改数据；该事务操作期间，这部分数据是锁定的，其他事务如果需要修改数据，需要等待当前事务提交或回滚后释放锁。

> ###### **行锁与表锁**
>
> ​		按照粒度，锁可以分为表锁、行锁以及其他位于二者之间的锁。表锁在操作数据时会锁定整张表，并发性能较差；行锁则只锁定需要操作的数据，并发性能好。但是由于加锁本身需要消耗资源(获得锁、检查锁、释放锁等都需要消耗资源)，因此在锁定数据较多情况下使用表锁可以节省大量资源。MySQL中不同的存储引擎支持的锁是不一样的，例如MyIsam只支持表锁，而InnoDB同时支持表锁和行锁，且出于性能考虑，绝大多数情况下使用的都是行锁。
>
> ###### **查看锁信息**
>
> ```sql
> #锁的概况
> select * from information_schema.innodb_locks;
> #Innodb整体的状态，其中包括锁的情况
> show engine innodb status;
> ```
>
> ​		一个例子：
>
> ```sql
> #在事务A中执行
> start transaction;
> #在事务B中执行
> start transaction;
> update accout SET balance = 200 where id = 1;
> ```
>
> ​		查看锁的情况：
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128200929607-1639664811.png)
>
> ​		show engine innodb status查看锁相关的部分：
>
> ![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128200936671-1683619195.png)
>
> ​		通过上述命令可以查看事务24052和24053占用锁的情况；其中lock_type为RECORD，代表锁为行锁(记录锁)；lock_mode为X，代表排它锁(写锁)。

###### 5、MVCC

###### MVCC在mysql中的实现

在Innodb中，会在每行数据后添加两个额外的隐藏值来实现mvcc，这两个值一个记录这行数据何时被创建，一个记录这行数据何时过期或者被删除。在实际操作中，存储的并不是时间，而是事务的版本号，每开启一个新的事务，事务的版本号就会递增，在可重读Repeatable read事务隔离级别下：

- select时，读取创建版本号 <= 当前版本号，删除版本号为空 或 > 当前事务版本号
- insert时，保存当前事务版本号为行的创建版本号
- delete时，保存当前事务版本号为行的删除版本号
- update时，插入一条新记录，保存当前事务版本号为行创建版本号，同时保存当前事务版本号到原来删除的行。

通过mvcc虽然每行记录都需要额外的存储空间，更多的行检查工作以及一些额外的维护工作，但可以减少锁的使用，大多数读操作都不用加锁，读数据操作很简单，性能很好，并且也能保证只读取到符合标准的行，也只锁住必要的行。

​		RR解决脏读、不可重复读、幻读等问题，使用的是MVCC：MVCC全称Multi-Version Concurrency Control，即多版本的并发控制协议。下面的例子很好的体现了MVCC的特点：在同一时刻，不同的事务读取到的数据可能是不同的(即多版本)——在T5时刻，事务A和事务C可以读取到不同版本的数据。

![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201126604-235257040.png)

​		MVCC最大的优点是读不加锁，因此读写不冲突，并发性能好。InnoDB实现MVCC，多个版本的数据可以共存，主要基于以下技术及数据结构：

>  1）隐藏列：InnoDB中每行数据都有隐藏列，隐藏列中包含了本行数据的`事务id`、`指向undo log的指针`等。
>
> 2）基于undo log的版本链：前面说到每行数据的隐藏列中包含了指向undo log的指针，而每条undo log也会指向更早版本的undo log，从而形成一条版本链。
>
> 3）ReadView：通过隐藏列和版本链，MySQL可以将数据恢复到指定版本；但是具体要恢复到哪个版本，则需要根据ReadView来确定。所谓ReadView，是指事务（记做事务A）在某一时刻给整个事务系统（trx_sys）打快照，之后再进行读操作时，会将读取到的数据中的事务id与trx_sys快照比较，从而判断数据对该ReadView是否可见，即对事务A是否可见。
>
> > trx_sys中的主要内容，以及判断可见性的方法如下：
> >
> > - low_limit_id：表示生成ReadView时系统中应该分配给下一个事务的id。如果数据的事务id大于等于low_limit_id，则对该ReadView不可见。
> > - up_limit_id：表示生成ReadView时当前系统中活跃的读写事务中最小的事务id。如果数据的事务id小于up_limit_id，则对该ReadView可见。
> > - rw_trx_ids：表示生成ReadView时当前系统中活跃的读写事务的事务id列表。如果数据的事务id在low_limit_id和up_limit_id之间，则需要判断事务id是否在rw_trx_ids中：如果在，说明生成ReadView时事务仍在活跃中，因此数据对ReadView不可见；如果不在，说明生成ReadView时事务已经提交了，因此数据对ReadView可见。

下面以RR隔离级别为例，结合前文提到的几个问题分别说明。

###### （1）脏读

![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201139635-1779107964.png)

​		当事务A在T3时刻读取zhangsan的余额前，会生成ReadView，由于此时事务B没有提交仍然活跃，因此其事务id一定在ReadView的rw_trx_ids中，因此根据前面介绍的规则，事务B的修改对ReadView不可见。接下来，事务A根据指针指向的undo log查询上一版本的数据，得到zhangsan的余额为100。这样事务A就避免了脏读。

###### （2）不可重复读

![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201149661-1275460669.png)

​		当事务A在T2时刻读取zhangsan的余额前，会生成ReadView。此时事务B分两种情况讨论，一种是如图中所示，事务已经开始但没有提交，此时其事务id在ReadView的rw_trx_ids中；一种是事务B还没有开始，此时其事务id大于等于ReadView的low_limit_id。无论是哪种情况，根据前面介绍的规则，事务B的修改对ReadView都不可见。

​		当事务A在T5时刻再次读取zhangsan的余额时，会根据T2时刻生成的ReadView对数据的可见性进行判断，从而判断出事务B的修改不可见；因此事务A根据指针指向的undo log查询上一版本的数据，得到zhangsan的余额为100，从而避免了不可重复读。

###### （3）幻读

![img](https://img2018.cnblogs.com/blog/1174710/201901/1174710-20190128201206609-1998192060.png)

MVCC避免幻读的机制与避免不可重复读非常类似。

当事务A在T2时刻读取0<id<5的用户余额前，会生成ReadView。此时事务B分两种情况讨论，一种是如图中所示，事务已经开始但没有提交，此时其事务id在ReadView的rw_trx_ids中；一种是事务B还没有开始，此时其事务id大于等于ReadView的low_limit_id。无论是哪种情况，根据前面介绍的规则，事务B的修改对ReadView都不可见。

当事务A在T5时刻再次读取0<id<5的用户余额时，会根据T2时刻生成的ReadView对数据的可见性进行判断，从而判断出事务B的修改不可见。因此对于新插入的数据lisi(id=2)，事务A根据其指针指向的undo log查询上一版本的数据，发现该数据并不存在，从而避免了幻读。

###### **扩展**

​		前面介绍的MVCC，是RR隔离级别下“非加锁读”实现隔离性的方式。下面是一些简单的扩展。

###### （1）读已提交（RC）隔离级别下的非加锁读

RC与RR一样，都使用了MVCC，其主要区别在于：

​		RR是在事务开始后第一次执行select前创建ReadView，直到事务提交都不会再创建。根据前面的介绍，RR可以避免脏读、不可重复读和幻读。

​		RC每次执行select前都会重新建立一个新的ReadView，因此如果事务A第一次select之后，事务B对数据进行了修改并提交，那么事务A第二次select时会重新建立新的ReadView，因此事务B的修改对事务A是可见的。因此RC隔离级别可以避免脏读，但是无法避免不可重复读和幻读。

###### （2）加锁读与next-key lock

按照是否加锁，MySQL的读可以分为两种：

​		一种是非加锁读，也称作快照读、一致性读，使用普通的select语句，这种情况下使用MVCC避免了脏读、不可重复读、幻读，保证了隔离性。

​		另一种是加锁读，查询语句有所不同，如下所示：

```sql
#共享锁读取
select...lock in share mode
#排它锁读取
select...for update
```

​		加锁读在查询时会对查询的数据加锁（共享锁或排它锁）。由于锁的特性，当某事务对数据进行加锁读后，其他事务无法对数据进行写操作，因此可以避免脏读和不可重复读。而避免幻读，则需要通过next-key lock。**next-key lock**是行锁的一种，实现相当于record lock(记录锁) + gap lock(间隙锁)；其特点是不仅会锁住记录本身(record lock的功能)，还会锁定一个范围(gap lock的功能)。因此，加锁读同样可以避免脏读、不可重复读和幻读，保证隔离性。

##### 二、原子性（Atomicity）

###### 1、定义

​		原子性是指一个事务是一个不可分割的工作单位，其中的操作要么都做，要么都不做；如果事务中一个sql语句执行失败，则已执行的语句也必须回滚，数据库退回到事务前的状态。

###### 2、实现原理：undo log

> ​		MySQL的事务日志有很多种，如二进制日志、错误日志、查询日志、慢查询日志等，此外InnoDB存储引擎还提供了两种事务日志：**redo log**(重做日志)和**undo log**(回滚日志)。其中redo log用于**保证事务持久性**；undo log则是**事务原子性**和**隔离性**实现的基础。
>
> ​		undo log。实现原子性的关键，是当事务回滚时能够撤销所有已经成功执行的sql语句。**InnoDB**实现回滚，靠的是undo log：当事务对数据库进行修改时，InnoDB会生成对应的undo log；如果事务执行失败或调用了rollback，导致事务需要回滚，便可以利用undo log中的信息将数据回滚到修改之前的样子。
>
> ​		undo log属于逻辑日志，它记录的是sql执行相关的信息。当发生回滚时，InnoDB会根据undo log的内容做与之前相反的工作：对于每个insert，回滚时会执行delete；对于每个delete，回滚时会执行insert；对于每个update，回滚时会执行一个相反的update，把数据改回去。
>
> ​		以update操作为例：当事务执行update时，其生成的undo log中会包含被修改行的主键(以便知道修改了哪些行)、修改了哪些列、这些列在修改前后的值等信息，回滚时便可以使用这些信息将数据还原到update之前的状态。

##### 三、一致性（Consistency）

###### 1. 定义

​		一致性是指事务执行结束后，**数据库的完整性约束没有被破坏，事务执行的前后都是合法的数据状态。**数据库的完整性约束包括但不限于：实体完整性（如行的主键存在且唯一）、列完整性（如字段的类型、大小、长度要符合要求）、外键约束、用户自定义完整性（如转账前后，两个账户余额的和应该不变）。

###### 2. 实现

> ​		可以说，一致性是事务追求的最终目标：前面提到的原子性、持久性和隔离性，都是为了保证数据库状态的一致性。此外，除了数据库层面的保障，一致性的实现也需要应用层面进行保障。
>
> ​		实现一致性的措施包括：
>
> - 保证原子性、持久性和隔离性，如果这些特性无法保证，事务的一致性也无法保证
> - 数据库本身提供保障，例如不允许向整形列插入字符串值、字符串长度不能超过列的限制等
> - 应用层面进行保障，例如如果转账操作只扣除转账者的余额，而没有增加接收者的余额，无论数据库实现的多么完美，也无法保证状态的一致

##### 四、持久性（Durability）

###### 1. 定义

​		持久性是指事务一旦提交，它对数据库的改变就应该是永久性的。接下来的其他操作或故障不应该对其有任何影响。

###### 2. 实现原理：redo log

> ​		InnoDB作为MySQL的存储引擎，数据是存放在磁盘中的，但如果每次读写数据都需要磁盘IO，效率会很低。为此，InnoDB提供了缓存(**Buffer Pool**)，**Buffer Pool**中包含了磁盘中部分数据页的映射，作为访问数据库的缓冲：`当从数据库读取数据时，会首先从Buffer Pool中读取，如果Buffer Pool中没有，则从磁盘读取后放入Buffer Pool`；当向数据库写入数据时，会首先写入Buffer Pool，Buffer Pool中修改的数据会定期刷新到磁盘中（这一过程称为刷脏）。
>
> ​		**Buffer Pool**的使用大大提高了读写数据的效率，但是也带了新的问题：如果MySQL宕机，而此时Buffer Pool中修改的数据还没有刷新到磁盘，就会导致数据的丢失，事务的持久性无法保证。
>
> ​		于是，**redo log**被引入来**解决**这个问题：**当数据修改时，除了修改Buffer Pool中的数据，还会在redo log记录这次操作；当事务提交时，会调用fsync接口对redo log进行刷盘。如果MySQL宕机，重启时可以读取redo log中的数据，对数据库进行恢复。**redo log采用的是WAL（Write-ahead logging，预写式日志），所有修改先写入日志，再更新到Buffer Pool，保证了数据不会因MySQL宕机而丢失，从而满足了**持久性**要求。
>
> ​		既然redo log也需要在事务提交时将日志写入磁盘，**为什么它比直接将Buffer Pool中修改的数据写入磁盘(即刷脏)要快呢？**主要有以下两方面的原因：
>
> （1）刷脏是随机IO，因为每次修改的**数据位置随机**，但写redo log是追加操作，属于**顺序IO**。
>
> （2）刷脏是以数据页（Page）为单位的，MySQL默认页大小是16KB，**一个Page上一个小修改都要整页写入**；而redo log中只包含真正需要写入的部分，无效IO大大减少。

###### 3. redo log与binlog

> ​		在MySQL中还存在binlog(二进制日志)也可以记录写操作并用于数据的恢复,但是redo log和bin log还是有些区别的：
>
> （1）作用不同：redo log是用于crash recovery的，保证MySQL宕机也不会影响持久性；binlog是用于point-in-time recovery的，保证服务器可以基于时间点恢复数据，此外binlog还用于`主从复制`。
>
> （2）层次不同：redo log是InnoDB存储引擎实现的，而binlog是MySQL的服务器层(可以参考文章前面对MySQL逻辑架构的介绍)实现的，同时支持InnoDB和其他存储引擎。
>
> （3）内容不同：redo log是物理日志，内容基于磁盘的Page；binlog的内容是二进制的，根据binlog_format参数的不同，可能基于sql语句、基于数据本身或者二者的混合。
>
> （4）写入时机不同：binlog在事务提交时写入；redo log的写入时机相对多元：
>
> - 前面曾提到：当事务提交时会调用fsync对redo log进行刷盘；这是默认情况下的策略，修改innodb_flush_log_at_trx_commit参数可以改变该策略，但事务的持久性将无法保证。
> - 除了事务提交时，还有其他刷盘时机：如master thread每秒刷盘一次redo log等，这样的好处是不一定要等到commit时刷盘，commit速度大大加快。

### 二、MySQL主从复制

#### 概念

​		MySQL主从复制是其最重要的功能之一。主从复制是指一台服务器充当主数据库服务器，另一台或多台服务器充当从数据库服务器，主服务器中的数据自动复制到从服务器之中。对于多级复制，数据库服务器即可充当主机，也可充当从机。MySQL主从复制的基础是主服务器对数据库修改记录二进制日志，从服务器通过主服务器的二进制日志自动执行更新。

##### binlog和relaylog的作用

> binlog的主要作用是记录数据库中表的更改，它只记录改变数据的sql，不改变数据的sql不会写入，比如select语句一般不会被记录，因为他们不会对数据产生任何改动。
>
> relay log中（中继日志）中，中继日志也是记录日志更新的信息的

#### 为什么需要主从复制

- 提高数据库读写性能，提升系统吞吐量

  ​		在业务复杂的系统中，如果有一条 SQL 语句的执行需要锁表，导致 MySQL 暂时不能提供读的服务，那么就很影响运行中的业务，使用主从复制，让主库负责写，从库负责读，这样即使主库出现了锁表的情景，通过读从库也可以保证业务的正常运作。

  ​		这样读写分离的过程能够是整体的服务性能提高，即使写操作时间比较长，也不影响读操作的进行。

#### 主从复制原理

![小白都能懂的Mysql主从复制原理（原理+实操）3](https://res-static.hc-cdn.cn/fms/img/e5e05b7b5cfd963c94c23a970564041f1603768896154)

Mysql的主从复制中主要有三个线程：`binlog dump thread、slave的I/O thread 、SQL thread）`。

> 当Master有数据更新的时候，会按照binlog 的格式，将更新的事件类型写入master的binlog文件中，创建binlog dump thread通知slave说master库中有数据更新，此时slave接收到通知之后，会创建I/O thread来请求master，master会返回binlog文件的副本以及数据更新的位置，slave收到binlog副本文件后，将文件保存在relay log中（中继日志）中，中继日志也是记录日志更新的信息的，随后sql thread在slave中创建，将更新的内容同步到slave数据库中，这样就保证了主从的数据同步。

以上就是主从复制的过程，当然，主从复制的过程有不同的策略方式进行数据的同步，主要包含以下几种：

同步策略：Master会等待所有的slave都回应后才会提交，这会使主从同步的性能严重的影响

半同步策略：Master至少会等待一个slave回应后在提交

异步策略：Master不用等待slave回应就可以提交

延迟策略：slave要落后Master指定的时间

#### 主从搭建

##### 删除mysql

这里提供centos7下完全卸载MySQL的方法

> 首先检查centos 7里面的Mysql安装包和依赖包：

> ```shell
> rpm -qa |grep mysql
> ```
>
> 接着可以删除上面的安装包和依赖包：
>
> ```shell
> sudo yum remove mysql*
> ```
>
> 继续检查一下是否存在Mariadb，若是存在直接删除Mariadb
>
> ```shell
> // 检查是否存在Mariadb
> rpm -qa |grep mariadb
> // 删除Mariadb
> sudo rpm -e --nodeps mariadb-libs-xxxxx.el7.x86_64
> ```
>
> 然后，就是删除Mysql的配置文件，可以使用下面的命令查找Msqyl配置文件的路径：
>
> ```shell
> sudo find / -name mysql
> ```
>
> 然后，通过下面的命令，将他们逐一删除：
>
> ```shell
> sudo rm -rf /usr/lib64/mysql
> 
> ```
>
> 接着就开始安装Mysql 8了，使用wget命令下载Mysql 8的repo源，并且执行安装：
>
> ```shell
> wget https://repo.mysql.com//mysql80-community-release-el7-3.noarch.rpm
> sudo yum -y install mysql80-community-release-el7-3.noarch.rpm
> ```

> 安装完后会在/etc/yum.repos.d/目录下生成下面的两个文件，说明安装成功了：
>
> mysql-community.repo
> mysql-community-source.repo
>
> 安装完Mysql8后，接着来更新一下yum源，并且查看yum仓库中的Mysql：
>
> ```shell
> // 更新yum源
> yum clean all
> yum makecache
> // 查看yum仓库中的Mysql
> yum list | grep mysql
> ```
>
> 可以查看到仓库中存在mysql-community-server.x86_64，直接安装就行了：
>
> ```javascript
> sudo yum -y install mysql-community-server
> ```
>
> 接着启动Mysql，并检查Mysql的状态：
>
> ```javascript
> // 启动Mysql
> systemctl start  mysqld.service
> // 检查Mysql的状态
> systemctl status mysqld
> ```
>
> 

[修改密码参考此链接的博客](https://blog.csdn.net/weixin_43640848/article/details/113064552?spm=1001.2014.3001.5501)

##### 开始搭建

这里使用的使用两台centos 7的vmware的ip分别是`192.168.163.155（Slave）`和`192.168.163.156（Master）`作为测试，首先在192.168.163.156（Master）中创建一个测试库test：

```javascript
// 创建测试库
create database test default character set utf8mb4 collate utf8mb4_general_ci;
// 并且授权
grant all privileges on test.* to 'test'@'%';
```

然后编辑Master中的my.cnf文件，此文件位于/etc/my.cnf，执行下面的sql，并添加下面的信息：

```javascript
sudo vi /etc/my.cnf

==========以下是配置文件中的信息=============
# 配置编码为utf8
character_set_server=utf8mb4
init_connect='SET NAMES utf8mb4'

# 配置要给Slave同步的数据库
binlog-do-db=test
# 不用给Slave同步的数据库，一般是Mysql自带的数据库就不用给Slave同步了
binlog-ignore-db=mysql
binlog-ignore-db=information_schema
binlog-ignore-db=performance_schema
binlog-ignore-db=sys
# 自动清理30天前的log文件
expire_logs_days=30
# 启用二进制日志
log-bin=mysql-bin
# Master的id，这个要唯一，唯一是值，在主从中唯一
server-id=3
```

配置完后重启Mysql服务，并查看Mysql的log_bin日志是否启动成功：

```javascript
systemctl restart mysqld
# 查看log_bin日志是否启动成功
show variables like '%log_bin%';
```

![小白都能懂的Mysql主从复制原理（原理+实操）10](https://res-static.hc-cdn.cn/fms/img/e4f43074b2ac347b63eb72413cc238d51603768896155)

接着查看Master的状态：

```javascript
show master status;
```

![小白都能懂的Mysql主从复制原理（原理+实操）11](https://res-static.hc-cdn.cn/fms/img/378a21cfaace770d4c2612f488e286d11603768896155)

这两个数据`File`和`Position`要记住，后面配置Slave的时候要使用到这两个数据。

最后登陆Master的数据库，并创建一个用户用于同步数据：

```javascript
create user 'backup'@'%' IDENTIFIED BY 'LDCldc-2020';
grant file on *.* to 'backup'@'%';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* to 'backup'@'%';
```

到这里Master的配置就配置完了，后面就进行Slave的配置。

在Slave中同样要创建test数据库，并且授权给test用户

```javascript
# 创建同步数据的test数据库
create database test default character set utf8mb4 collate utf8mb4_general_ci;
# 授权
grant all privileges on test.* to 'test'@'%';
```

接着编辑Slave中my.cnf文件，同样是在/etc/my.cnf路径下，加入如下配置：

```javascript
# 配置从服务器的ID，唯一的
server-id=4
#加上以下参数可以避免更新不及时，SLAVE 重启后导致的主从复制出错。
read_only = 1
master_info_repository=TABLE
relay_log_info_repository=TABLE
```

并且重启Slave中的Mysql服务：

```javascript
systemctl restart mysqld
```

在Slave中添加Master的信息：

```javascript
# master_host是Master的ip，master_log_file和master_log_pos就是配置之前查看Master状态时显示的File和Position信息
change master to master_host='192.168.163.156',master_port=3306,master_user='backup',master_password='LDCldc-2020',master_log_file='mysql-bin.000001',master_log_pos=1513; 
```

最后查看Slave的状态：

```javascript
show slave status\G
```

![小白都能懂的Mysql主从复制原理（原理+实操）12](https://res-static.hc-cdn.cn/fms/img/33e958b62244225ced7111c1dfd6d72b1603768896156)

当看到`Slave_IO_Running`和`Slave_SQL_Running`都是yes的时候，这表示主从配置成功。

**「Slave_IO_Running也就是Slave中的IO线程用于请求Master，Slave_SQL_Running时sql线程将中继日志中更新日志同步到Slave数据库中。」**

但是，有时候Slave_IO_Running会为no，而Slave_SQL_Running为yes

首先看重启一下`Slave`的MySQL服务：`systemctl restart mysqld`，然后执行：

```javascript
stop slave;
start slave;
```

这样就能够使`Slave_IO_Running`和`Slave_SQL_Running`显示都是yes了

#### Mysql主机宕机的解决方法

​		假设我们有三个机子

master： 192.168.80.130

slave：192.168.80.143

slave：192.168.80.146

​		首先模拟（MySQL---master）宕机：

```shell
service mysqld stop
```

​		当master宕机后去slave去查看是否出现错误信息

```mysql
show slave status\G;
```

​		这时两台SLAVE主机已经连接不上MASTER

​		IO进程和sql进程状态：Slave_IO_Running: Connecting(该状态表示会一直尝试重连主，如果主正常了，该进程状态会自动变成Yes)，此时，master不能提供读写服务。我们想将其中最新的slave提升为主。

​		具体操作步骤如下：

1、在每个SLAVE库上执行：

```mysql
stop  slave io_thread;

show  processlist;
```

直到看到Slave has read all relay log; waitingfor more updates,则表示从库更新都执行完毕了

2、 选择新的主库

​		对比选择Relay_Master_Log_File,Exec_Master_Log_Pos最大的作为新的主库，这里我们选择slave1为新的主库

​		其实，如果两个从IO进程一直都是正常，没有落后于主，且relay log都已经重放完成，两个从是一样的，选择哪个都可以。

​		这里选择slave1作为新主。

3、进行相应配置

​		登陆slave1，执行stop slave;并进入数据库目录，删除master.info和relay-log.info文件（删除前，可以先备份下这俩文件）；

​		配置my.cnf文件，开启log-bin,如果有log-slaves-updates=1和read-only=1则要注释掉，然后重启slave1.

4、 reset master

> 在slave1上reset master，会重新生成二进制日志。
>
> mysql> reset master;
>
> Query OK, 0 rows affected (0.02 sec)
>
> mysql> show master status;
> +------------------+----------+--------------+------------------+
> | File | Position | Binlog_Do_DB | Binlog_Ignore_DB |
> +------------------+----------+--------------+------------------+
> | mysql-log.000001 | 399 |        |            |
> +------------------+----------+--------------+------------------+
> 1 row in set (0.00 sec)

5、创建用于同步的用户

如果slave1完全同步master的话，这步可以省略。

6、 slave2指向slave1

```mysql
mysql>change master to master_user='RepUser',master_password='beijing',master_host='192.168.80.134',master_port=3306,master_log_file='mysql-bin.000001',master_log_pos=154;

mysql>start slave;
```

### 三、各种树结构的比较

#### 二叉查找树（二叉搜索树）

> #### 什么是二叉查找树
>
> 1. 左子树所有节点的值均小于或等于它的根节点的值
> 2. 右子树上所有节点的值均大于或等于它的根节点的值
> 3. 左、右子树也分别为二叉排序树
>
> #### 平衡二叉树
>
> 平衡二叉树的出现就是为了保证树不至于太倾斜，尽量保证两边平衡，那么什么样的树称为平衡二叉树？
>
> - 定义：要么是一个空树，要么保证左右子树的高度差<=1，同时每一个子树都是平衡二叉树
> - 当然，为保证二叉树的平衡性，平衡二叉树在添加和删除节点是需要进行旋转以保持树的平衡
> - 既能保持左右子树的高度差<=1，其实也就保证的平衡二叉树的插入，查询的时间复杂度都是O(log2(n))

#### 红黑树

> 红黑树也是二叉查找树，红黑树之所以难死难在它是自平衡的二叉查找树，在进行插入和删除等可能破坏树的平衡的操作是，需要重新自处理达到平衡状态。
>
> #### 红黑树的定义和性质
>
> 红黑树是一种含有红黑节点并且能够自平衡的二叉查找树，他必须满足下面的性质：
>
> 1. 每个节点要么是黑色，要么就是红色
> 2. 根节点是黑色
> 3. 每个叶子节点是黑色
> 4. 每个红色节点的两个子节点一定是黑色
> 5. 任意节点到每个叶子节点的路径都包含数量相同的黑节点
> 6. 从性质5推出如果一个节点存在黑子节点，那么该节点肯定有两个子节点
>
> ![img](https://upload-images.jianshu.io/upload_images/2392382-4996bbfb4017a3b2.png?imageMogr2/auto-orient/strip|imageView2/2/w/526/format/webp)
>
> 红黑树并不是一个*完美*平衡二叉查找树，从上图可以看到，根结点P的左子树显然比右子树高，但左子树和右子树的黑结点的层数是相等的，也即任意一个结点到到每个叶子结点的路径都包含数量相同的黑结点(性质5)。所以我们叫红黑树这种平衡为**黑色完美平衡**。
>
> 红黑树节点的叫法：![img](https://upload-images.jianshu.io/upload_images/2392382-abedf3ecc733ccd5.png?imageMogr2/auto-orient/strip|imageView2/2/w/772/format/webp)
>
> 红黑树能自平衡它靠的是三种操作：左旋、右旋和变色
>
> - 左旋：以某个节点作为支点（旋转节点），其右子节点变为旋转节点的父节点，右子节点的左子节点变为旋转节点的右子节点，左子节点保持不变
>
> ![img](https://upload-images.jianshu.io/upload_images/2392382-a95db442f1b47f8a.png?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)
>
> - 右旋：以某个节点作为支点（旋转节点），其左子节点变为旋转节点的父节点，左子节点的右子节点变为旋转节点的左子节点，右子节点保持不变
>
> ![img](https://upload-images.jianshu.io/upload_images/2392382-0676a8e2a12e2a0b.png?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)
>
> - 变色：节点的颜色由红变黑或由黑边红
>
> 左旋只影响旋转节点和其右子树的结构，把右子树的节点往左子树挪了
>
> 右旋只影响旋转节点和其左子树的结构，把左子树的节点往右子树挪了
>
> [红黑树的理解](https://www.jianshu.com/p/e136ec79235c)

#### B树（B - 树）

#### B+树



### 四、索引失效

1. 如果`条件中有or的话`，即使其中有条件带索引也不会使用，如果想使用or又想让索引生效的话，那就得为or条件中的每个列都加上索引。

2. `like通配符`，但是用模糊搜索是，尽量采用后置的通配符，例如：name||‘%’，因为走索引时，会从前去匹配索引列，这时候是可以找到的，如果采用前匹配，那么查索引就会很麻烦，比如查询所有姓张的人，就可以去搜索“张%”，相反如果你查询叫“明”的人，那么只能是“%明”，这时候索引就无法定位，所以在前匹配符的情况下，执行计划会更倾向于选择全表扫描，后匹配的话会走索引（INDEX RANGE SCAN）。所以业务设计如果考虑到模糊搜索问题的话要尽量使用后置通配符。

3. 如果``列类型是字符串``，那一定要在条件中将数据使用引号引用起来，否则不会使用索引

5. 例如在某个表中，有两列（id和_id）都建立了单独索引，下面这种查询条件不会走索引

   ```sql
   select * from test where id = _id;
   ```

6. `存在NULL值条件`，并不是存在null值就不能使用索引，当查询某列值是否为null或者和其他条件一起使用的时候都是可以使用到索引的，包括给存在null值的列添加联合索引，使用SQL进行条件查询的时候也可以使用到索引。虽然mysql可以在含有null的列上使用索引，但是不代表null和其他数据在索引中是一样的，不建议列上允许为空，最好设置not null，并设置一个默认值，比如0和“ ”空字符串等，如果是datetime类型，可以设置成“1970-01-0 00:00:00”这样的特殊值。对于mysql来说，null是一个特殊值，不能使用<,=,>这样的运算符，对null做算术运算的结果都是null，count时不会包括null行，某列可为null比not null可能小更多的存储空间。

7. `NOT条件`，我们建立索引时，如果查询条件为等值或者范围查询时，索引可以根据查询条件去找对应的条目，反过来当查询条件为非是，索引定位就比较困难了，执行计划是可能会更倾向于全表扫描，这类的查询条件有：<>、NOT、in、not exists

   ```sql
   select * from test where id<>500;
   select * from test where id in (1,2,3,4,5);
   select * from test where not in (6,7,8,9);
   select * from test where not exists (select 1 from test_02.id = test.id);
   ```

8. 条件上包括函数，查询条件上尽量不要``对索引使用函数``，比如下面这个sql

   ```sql
   select * from test where upper(name) = 'SUNYANG';
   #这样是不会走索引的，因为索引在建立是会和计算之后的可能不同，无法定位到索引，但是如果查询条件不是对索引列进行计算，那么可以走索引，比如：
   select * from test where name=upper('sunyang');
   # 这样的函数还有：to_char、to_date、to_number、trunc等
   ```

9. 数据类型的转换，例如当``查询条件存在隐式转换``时，索引也会失效，比如在数据库中里id存number类型，但是在查询是，却用了下面的形式：

   ```sql
   select *  from sunyang where id='123';
   ```