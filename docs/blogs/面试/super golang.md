## super Golang



### new和make的区别

new和make都是用来内存分配的，且都在堆上分配内存。
make用来初始化map、slice、chan，返回引用类型本身；
new的作用是根据传入的类型分配一片内存空间并返回指向这片内存空间的指针，
new也可以初始化map,slice和chan，但是不会初始化他们的内部数据结构。



### slice和数组的区别

数组的长度是固定的，slice的长度是可以动态调整的。
数组在创建的时候需要固定长度，而slice则不需要。
slice的底层也是数组实现的，slice是通过一个结构体，结构体中有cap字段（表示切片容量）、len字段（表示切片长度）和array字段（是一个指针指向底层的数组地址）。



### slice的动态扩容说一下

当新切片需要的容量大于来被扩容容量时，直接按照新切片需要的容量扩容；
当等原来切片的容量小于1024时，新切片扩容到原来切片的2倍；
当原来切片的容量大于等于1024时，新切片扩容到原来的1.25倍；



### 参数传递切片和切片指针有什么区别

切片就是一个slice结构体，结构体的中有array字段指向底层数组。
所以不管传递的是切片还是切片指针，都是指向底层的同一个数组（传递切片实则是创建一个新的slice结构体，但是slice结构体的array字段还是指向原先的底层数组地址，传递切片指针就是将原先slice结构体的地址值进行传递，就不需要创建新的slice结构体而已）
所以不管是传递切片还是切片指针，在函数内对切片进行修改时都会影响到函数外的切片（除非函数内的切片是copy创建出来的或者是触发了扩容创建了新的底层数组）。


### 有没有遇到过内存逃逸会带来什么影响



### range遍历切片有什么需要注意的吗

range在遍历前是先将切片的值copy出一份进行遍历，所以在range中对v进行修改不会影响原切片的结果，不过可以使用切片下表的形式进行更改切片值。


### map的底层数据结构是怎么样子的

map的底层结构体是一个hmap，hmap里面维护着buckets数组，buckets数组的数量为2^B,buckets数组中的每个元素都是bmap结构体，bmap中有tophash字段,tophash是个容量为8的uint8数组。


### 怎么进行查找操作
首先key进行hash，通过hash后的低B位得到buckets数组的下标，查看buckets数组下标对应的元素，也就是bmap中，

查看bmap中的tophash是否与key进行hash后的高8位相同，相同就再查看key值是否相同，相同就拿出value的值；

如果tophash中都没有相同的值就去溢出桶中找，重复上面的步骤，知道找到key或者没有溢出桶为止。


### 怎么进行扩容操作
map的扩容是渐进式的，即扩容操作都是拆散在每一次写操作里面。然后扩容有两个触发条件：

1. map的负载因子（长度和容量的比例）超过阈值（6.5），此时map就会认为无法承担更多的key，需要进行两倍扩容。扩容发生时会将老数据存进oldbuckets，每次对map进行增删改查的时候会触发从oldbucket中迁移到bucket的操作（渐进式），在扩容没有完全迁移完成之前，每次get或者put或者遍历数据时，都会先遍历老oldbucket再遍历bucket
2. 当B < 15时，overflow的bucket数量超过了2^B 或 当B > 15时，overflow的bucket数量超过2^15。map就认为局部bmap含有过多的overflow，此时就会把后置位的数据整理到前面，这种情况下元素是发生重排而不会换桶，即相同容量扩容。


### map是线程安全的吗，怎么现场安全使用map
不是所以map在写入的时候进行读取操作会报错，可以使用sync.mutex，sync.RWmutex，sync.map


### mutex有几种模式


### 那这几种方式在性能上有什么区别呢

sync.RWMutex的锁适合读多写少的场景，因为读锁可以多重加锁，当有读操作时不会阻塞读操作，会阻塞写操作。当有写操作时会阻塞写操作和读操作

sync.map对map进行读时不需要加锁，使用read和dirty两个map来进行读写分离，read和dirty都指向同一个底层的map。

read相当于一个缓存层，提供了快速查找map的结构，查找过程是如果read中存在则返回，若没有则判断amended属性，判断dirty是否包含read没有的数据，若amended就去dirty中查找


### channel的底层数据结构是怎样的
channel用一个环形队列buf缓存收到的消息，分别用两个waitq类型的双向列表recvq和sendq存储当缓冲区已满时接收端和发送端的goroutine信息，用来记录buf循环链表当前发送和接收数据的下标sendx和recvx。

在创建channel时可以选择不带缓冲和带缓冲，如果不带缓冲就只给hchan本身分配内存；

如果带缓冲且不包括指针类型，就给hchan和环形队列缓存buf分配一段连续的空间；

如果带缓冲且包含指针类型，就给hchan和环形队列缓存buf分别分配内存空间。

### channel如何进行发送和接收
发送数据

1. 如果recvq不为空且buf为空，就直接将数据发送给等待接收数据的goroutine，就不放进队列中。
2. 如果recvq为空且buf未满，就只能将数据发送给缓冲区buf
3. 如果buf已满，那就只能将发送数据的goroutine打包成sudog对象放入sendq，并将goroutine设置为等待状态

接受数据

1. 如果sendq不为空且buf未空，就直接从sendq中取出一个等待发送数据的goroutine，取出数据
2. 如果buf不为空，就从buf中取出数据
3. 如果buf未空且sendq不为空，就将该接收数据的goroutine打包成sudog对象放入recvq，将goroutine设置为等待状态



### channel是线程安全的吗
是，在对buf的数据进行入队和出队操作是，使用了互斥锁防止多个线程并发修改数据


### context包有什么作用？
用于goroutine之间传递信号和一些共享值，可以使用value进行传值，也可以使用deadline、done、err进行控制


### 线程有几种模型，goroutine的原理了解吗
linux中的操作系统模型主要是是说内核线程和用户线程的模型，有一对一，一对 N , M 对 一，N 对 M关系

GMP中的G代表着用户级线程就是协程，协程有自己的调用栈。M代表系统内核线程。P代表调度器，有执行所需要的资源和本地执行队列，可以通过runtime.GOMAXPROCS()去设置的。

还有全局队列，用于存放等待运行的G。P的本地队列，用于存放等待运行中的G，但存的数量不超过256个。

新建G时，G会优先加入到P的本地队列，如果队列满了就会把本地队列中一半的G移动到全局队列中。

如果M想运行任务就得获取P,如果p的本地队列为空，M就会尝试从全局队列中拿一批G放到P的本地队列或者从其他P的本地队列中偷一半放到自己P的本地队列中。


### 在GPM模型中，G有几种状态？
Gidle：表示goroutine刚刚被分配还没有初始化

Grunnable：处于Grunnable的任务一定在任务队列中等待被调度

1.  当goroutine被分配资源以及初始化后，会被置为Grunnable，然后被添加到P的本地队列中等待调度
2.  当某个阻塞任务(Gwaiting)的等待条件满足被唤醒时，任务状态会被重置为Grunnable，并加入P的运行队列中等待调度
3.  某个G被sysmon发现运行时间超过10ms时会被调度器重新切换为Grunnable放回本地队列中并执行其他G

Grunning:当任务被P获取到时会将状态切换为Grunning

Gsyscall：当任务执行系统调用前，会被置为Gsyscall，如果调用是阻塞式的会加当前的M与P分离。当系统调用返回后如果当前任务没有被抢占则将任务切回Grunning，否则这位Grunnable并返回任务队列中

Gwaiting：当一个任务需要的资源或者运行条件不满足时，会被置为Gwaiting状态。

Gdead：一个任务执行结束

### 线程有几种状态？

New:线程创建尚未调用start方法
Runnable：等待被CPU调度
Running：获得CPU时间片执行代码
Blocked：线程因为某种原因放弃CPU使用权
Dead:现场退出


### goroutine什么时候会发生阻塞，如果G一直占用资源怎么办
1. 由于原子、互斥量和通道阻塞等操作导致G阻塞，调度器会把当前的G切换为Gwaiting状态，调度其他G。

2. 由于网络请求导致G阻塞，Go提供了网络轮训器（NetPoller）来处理网络请求和IO操作的问题，其背后是通过kqueue、epoll、iocp来实现IO多路复用。通过使用NetPoller进行网络系统调用，调度器可以防止G在进行系统调用时阻塞M，可以让M执行其他G，而不需要新的M。
3. 当调用一些系统方法的时候（如文件IO操作）会发生阻塞，进行系统调用的G将阻塞M，G将被切换为Gsyscall状态，调度器只能引入其他M来绑定P。
4. 执行sleep操作导致 M 被阻塞，Go程序有一个监控线程sysmon，监控长时间占用运行的G然后设置抢占标识符，别的G就可以抢先进来执行。



### 有没有遇到goroutine飙升的问题，怎么排查
channel:

- 无缓冲的channel的阻塞通常是写操作因为没有被读而阻塞
- 有缓冲的channel因为缓冲区满了，写操作阻塞
- 从channel读数据，结果没有Goroutine写

select:

- 所有case上的操作阻塞

  

web程序可以在代码上加入net/http/pprof 包，开启端口访问，访问debug/pprof,查看是否有Goroutine运行时间过长和查看Goroutine数量。

用go tool pprof -seconds=10 -http=:9999 XXX/debug/pprof/heap,生成监控信息文件，查看内存使用情况。

不是web程序在代码上加入runtime/pprof 包，可以将监控文件保存到指定目录下，可以使用go tool pprof 二进制文件位置 生成文件名 ，生成监控文件。

### 实现一个负载均衡算法




### go反射有了解吗？说说原理和作用
反射是一种机制可以让我们在程序运行时访问、检测和修改对象本身状态或行为的一种能力。

从一个变量推断出器类型信息、以及存储的数据的一些信息，又或者是获取一个对象有什么方法可以调用等。



### 线上有没有死锁的问题，怎么排查MySQL死锁的问题
发现死锁异常后，我们可以直接使用`show engine innodb status`命令获取死锁信息，但是该命令只能获取最近一次的死锁信息。所以我们可以通过开启innodb的监控机制来获取实时的死锁信息，它会周期性打印innodb的运行状态到mysqld服务的错误日志中。
```shell
set GLOBAL innodb_status_output = ON;
set GLOBAL innodb_status_output = OFF;
set GLOBAL innodb_status_output_locks = ON;
set GLOBAL innodb_status_output_locks = OFF;
```
另外MySQL还提供了一个系统参数`innodb_print_all_deadlocks`专门记录死锁日志，当发生死锁时，死锁日志会记录到MySQL的错误日志文件中。
```shell
set GLOBAL innodb_print_all_deadlocks = ON;
```

### 讲一下raft算法(zab、paxos、gossip)  