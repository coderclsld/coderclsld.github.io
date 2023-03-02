## GoRuntime

[深度长文：深入Go Runtime，你能做到浅出吗? (qq.com)](https://mp.weixin.qq.com/s/ivO-USpxiyrL-9BzgE8Vcg)

### 内存分配

`内存分配，类似于TCMalloc `

> - 使用span机制来减少碎片，每个span至少为一个页（go中一个page为8KB），每一种span用于一个范围的内存分配需求，比如16-32byte使用分配32byte的span，112-128使用分配128byte的span。一共有67个size范围，8byte-32KB，每个size有两种类型（scan和noscan，表示分配的对象是否包含指针）
> - 多层次的Cache来减少分配的冲突，per-P无锁的mcache，全局67*2个对应不同size的span的后背mcentral，全局一个的mheap，mheap中以treap的结构维护空闲连续page，归还内存到mheap时，连续地址会进行合并。
> - go代码分配内存优先从当前P的mcache对应size的span中获取，有的话再从对应size的mcentral中获取一个span，还没有的话从mheap中sweep一个span；sweep不出来，则从mheap中空闲块找到对应span大小的内存，mheap中如果还没有，则从系统申请内存，从无锁到全局1/(67*2)粒度的锁，再到全局锁，再到系统调用。
> - stack分配也是多层次和多class的，减少分配的锁争抢，减少栈浪费。
> - 对象由GC进行回收，sysmon会定时吧空余的内存归还给操作系统。

#### mcache：

> 在GMP模型下，会在每个P下都有一个mcache字段，用来表示内存信息，在go 1.2版本前调度器使用的是GM模型，将mcache放在了M里，但发现存在诸多问题，其中对内存这一块存在巨大的浪费，每个M都持有mcache和stack alloc，但只有在M运行go代码的时候才需要使用的内存，当M在处于syscall或网络请求的时候是不需要的，在加上M又是运行创建许多个的，这就造成极大的浪费。所以在go 1.3版本开始使用了GMP模型，这样在高并发状态下，每个G只有在运行的时候才会使用到内存，而每个G会绑定一个P，所以他们在运行时只占用一份mcache，对于mcache的数量就是P的数量，同时并发访问时也不会产生锁。

#### mspan：

> mcache中持有一系列的mspan从8字节到32KB分了大概67种mspan

#### mcentral：

> 如果分配内存时mcache没有空闲的32KB的mspan就去mcentral里拿取，mcentral里面会维护着所有span范围大小的mspan列表，包括已分配出去的和未分配出去的，所以mcentral存在多个goroutine竞争的情况，因此从mcentral获取支援的时候需要加锁。**nonempty**表示链表里还有空闲的`mspan`待分配。**empty**表示这条链表里的`mspan`都被分配了`object`

#### mheap：

> mheap主要用于大对象的内存分配（或者直接大于32KB的内存申请），以及管理未切割的mspan，用于给mcentral切割成小对象，所有的mcentral集合都是放在mheap里面的，nheap里面的arena区域才是真正的兑取，运行时会将8KB看做一页，这些内存页存储了所有在堆上进行初始化的对象。运行时使用`runtime.heapArena`数组管理所有内存，如果arena区域没有足够的空间，会调用`runtime.mheap.sysAlloc`从操作系统中申请更多的内存

### GC垃圾回收

#### 三色标记：

> - 有黑白灰三个集合，初始化时所有对象都是白色的
> - 从Root对象开始标记，将所有可达对象标记为灰色
> - 从灰色对象集合取出对象，将其引用的对象标记为灰色，放入灰色集合，并将自己标记为黑色。
> - 重复第三步，直到灰色集合为空，即所有可达对象都被标记。
> - 标记结束后，不可达的白色对象即为垃圾，对内存进行迭代清扫，回收白色对象。
>
> 三色标记需要维护不变性条件：黑色对象不能引用无法被灰色对象可达的白色对象。并发标记时如果没有在正确的保障措施，可能会导致漏标记对象，导致实际上可达的对象被清扫掉。为你解决这个问题，go使用了写屏障（和内存写屏障不是同一个概念），写屏障是在写入指针前执行的一小段代码，用以防止并发标记时指针丢失，这一小段代码go是在编译时加入的

### GMP

[Golang三关-典藏版 Golang 调度器 GMP 原理与调度全分析 | Go 技术论坛 (learnku.com)](https://learnku.com/articles/41728)

[深入分析Go1.18 GMP调度器底层原理 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/586236582)

> 其实线程分为内核态线程和用户态线程，每一个内核态线程可以与一个用户态线程绑定
>
> - G：goroutine，用户态线程，有自己对的栈，instruction pointer和其他信息（正在等待的channel等），用于调度
> - P：processor，代表执行所需要的资源（调度的上下文，队列等），实现从N:1到N:M的关键
> - M：系统内核线程
> - global runqueue：未分配Processer的goroutine保存在全局队列中，Processer或M都可以con全局队列中取出G
> - local runqueue：是Processer的队列，当队列为空时，会从全局队列或其他队列中补充Goroutine
>
> `P的数量可以通过GOMAXPROCS()来设置，他其实就代表着真正的并发度，有多少个goroutine可以同时运行`
>
> `P每个时刻只能运行一个goroutine，没有被运行的goroutine就会被放到runqueue中，等待被调度`
>
> `为何要维护线程上下文P，因为当一个OS线程被阻塞时，P就可以投奔到另一个OS内核线程`

#### 饥饿问题

> 为了保证公平性和防止 Goroutine 饥饿问题，Go 程序会保证每个 G 运行 10ms 就让出 M，交给其他 G 去执行，这个 G 运行 10ms 就让出 M 的机制，是由单独的系统监控线程通过 retake() 函数给当前的 G 发送抢占信号（基于信号的抢占式调度机制）实现的，如果所在的 P 没有陷入系统调用且没有满，让出的 G 优先进入本地 P 队列，否则进入全局队列
>
> G 在运行时中的状态可以简化成三种：等待中_Gwaiting、可运行_Grunnable、运行中_Grunning，运行期间大部分情况是在这三种状态间来回切换
>
>  M 的状态可以简化为只有两种：自旋和非自旋；**自旋状态，表示 M 绑定了 P 又没有获取 G**；非自旋状态，表示正在执行 Go 代码中，或正在进入系统调用，或空闲
>

