## channel
### channel的数据结构

- channel内部数据结构是固定长度的**双向循环链表**
- 按顺序往里面写数据，写满后又从零开始写
- chan中的两个重要组件是buf和waitq，所有的行为和实现都是围绕着这两个组件进行的

```go
type hchan struct {
  
  qcount uint //当前队列中总元素个数 
  dataqsiz uint //环形队列长度，即缓冲区大小
  buf unsafe.Pointer //环形队列指针
  elemsize unit64// buf中每个元素的大小
    
  closed uint32//单签通道是否处于关闭状态，创建通道时该字段为0，关闭时字段为1
  elemtype *_type // 元素类型，用于值传过程的赋值  
    
  sendx uint //环形缓冲区中已发送位置索引
  revx uint //环形缓冲区中已接收为索引
    
  recvq waitq //等待读消息的routine队列
  sendq waitq //等待发送消息的routine队列
    
  lock mutex //互斥锁，为每个读写操作锁定通道（发送和接收必须互斥）
}

type waitq struct {
  first *sudog
  last *sudog
}
```
![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a20f10cd62284684963a3a1edd44a90e~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)



### 创建channel

创建channel时，可以往channel中放入不同类型的数据，不同数据占用的空间大小也不一样，这决定了hchan和hchan中的buf字段需要开辟多大的存储空间，在go中需要对不同的情况进行处理，包含三种情况
> 总体原则是:总内存大小 = hchan需要的内存大小 + 元素需要的内存大小
- 队列为空或元素大小为0：只需要开辟的内存空间为hchan本身大小
- 元素不是指针类型：需要开辟的内存空间=hchan本身大小+每个元素的大小*申请的队列长度
- 元素是指针类型：这种情况下buf需要单独开辟空间，buf占用内存大小为每个元素的大小*申请的队列长度
对应源码
```go
//对应的代码Wie c := make(chan int,size)
//c := make(chan int)这种情况下，size为0
func makechan(t *chantype,size int) *hchan{
  elem := t.elme
  //总共需要的buff大小 = channel中创建的这种元素类型的大小(elem.size) * size
  mem,overflow := math.MulUintptr(elem.size,uintptr(size))
  var c *hchan
  //为buf创建并分配空间
  switch {
    case mem == 0:
      c = (*hchan)(mallocgc(hchanSize,nil,true))
      c.buf = c.raceaddr()
    case elem.ptraddr == 0:
      c = (*hchan)(mallocgc(hchanSize + men,nil,true))
      c.buf = add(unsafe.Pointer(c),hchanSize)
    default:
      c = new(hchan)
      c.buf = mallocgc(mem,elem,true)
  }
  c.elemsize = uint16(elem.size)
  c.dataqsiz = uint(size)
  return c
}
```
### 发送数据到channel
发送数据到channel，直观的理解就是将数据放到chan的环形队列中，不过go做了一些优化，先判断是否有等待接收数据的groutine，如果有直接将数据发送给groutine，就不放进队列中了。当然还有一种情况就是队列如果满了，那就只能放到队列中等待，知道有数据被取走才发送。

1.如果recvq不为空，从recvq中取出一个等待接收数据的Groutine，将数据发送给Groutine
2.如果recvq为空，才将数据放入buf中
3.如果buf已满，则将要发送的数据和当前的Groutine打包成Sudog对象放入sendq，并将groutine设置为等待状态

### 发送数据
```go
//ep指向要发送数据的首地址
func chansend(c *hchan,ep unsafe.Pointer,block bool,callerpc uintptr)bool{
  //上锁
  lock(&c.lock)
  //如果channel已经关闭，抛出错误
  if c.closed != 0{
    unlock(&c.unlock)
    panic(plainError("send on closed channel"))
  }
  //从接收队列中取出元素，如果取到数据，就将数据传过去
  if sg := c.recvq.dequeue(); sg !=nil{
    //调用send方法，将指传过去
    send(c,sg,ep,func(){unlock(&c.lock)},3)
    return true
  }
  //到这里说明没有等待接收数据的goroutine,如果缓冲区没有满就直接将要发送的数据复制到缓冲区
  uf c.qcount < c.dataqsiz{
    //c.sendx是已经发送的索引的位置，这个方法通过指针偏移找到索引位置，相当于执行c.buf(sendx)
    ap := chanbuf(c,sendx)
    if raceenabled{
      raceacquire(qp)
      racerelease(qp)
    }
    //复制数据内存调用了memove，是用汇编实现的，通知接收方数据给你了，将接收方写协程由等待状态改成可运行状态，将当前协程加入携程队列，等待被调度
    typedememove(c.elemtype,qp,ep)
    //索引前移，如果到了末尾，又从0开始
    c.sendx++
    if c.sendx == c.dataqsiz{
      c.sendx = 0
    }
    //元素个数加1，释放锁并返回
    c.qcount++
    unlock(&c.lock)
    return true
  }
  //走到这里说明缓冲区也写满了，同步非阻塞状态，直接返回
  if !block{
    unlock(&c.lock)
    return false
  }
  //以下为同步阻塞的情况，此时会将当前的goroutine以及要发送的数据放入sendq队列中，并切换出该goroutine
  gp := getg()
  mysg := acquireSudog()
  mysg.releasetime = 0
  if t0 != 0{
    mysg.releasetime = -1
  }
  //
  mysg.elem = ep
  mysg.waitlink = nil
  mysg.g = gp
  mysg.isSelect = false
  mysg.c = c
  gp.waiting = mysg
  gp.param = nil
  //将goroutine放入sendq队列中
  c.sendq.enqueue(mysg)
  //goroutine转入waiting状态，gopark是调度相关的代码，在用户看来向channel发送数据的代码语句会阻塞
  gopark(chanparkcommit,unsafe.Pointer(&c.lock),waitReasonChanSend,traceEvoblockSend,2)
  if mysg != gp.waiting{
    throw("G waiting list is corrupted")
  }
  gp.waiting = nil
  gp.activeStackChans = false
  if gp.param == nil{
    if c.closed == 0{
      throw("chansend: spurious wakeup")
    }
    panic(plainError("send on closed channel"))
  }
  gp.param = nil
  if mysg.releasetime > 0{
    blockevent(mysg.releasetime-t0,2)
  }
  mysg.c = nil 
  //g被唤醒，状态改成可执行状态，从这里开始继续执行
  releaseSudog(mysg)
  return true
}
```
send方法
```go
func send(c *hchan,sg *sudog,ep unsafe.Pointer,unlock func(),skip int){
  if sg.elem != nil{
    sendDirect(c.elemtype,sg,ep)
    sg.elem = nil
  }
  gp := sg.g
  unlockf()
  gp.param = unsafe.Pointer(sg)
  if sg.releasetime != 0{
    sg.releasetime = cputicks()
  }
  goready(gp,skip+1)
}
```
### 读取数据
从channel读取数据时，不是直接去环形队列中去哪数据，而是先判断是否有等待发送数据的goroutine，如果有直接将groutine出队列，取出数据返回，并唤醒groutine，如果没有等待发送数据的groutine，再从环形队列中取数据。

1、如果有等待发送数据的goroutine，从sendq中取出一个等待发送数据的groutine，取出数据
2、如果没有等待的groutine，且环形队列中有数据，从队列中取出数据
3、如果没有等待的goroutine,且环形队列中也没有数据，则阻塞该groutine，并将groutine打包为sudogo加入到recevq等待队列中。
```go
func channrecv(c *hchan,ep unsafe.Pointer,block bool)(selected,receive bool){
  lock(&c.lock)
  if sg := c.sendq.dequeue(); sg != nil{
    recv(c,sg,ep,func(){
      unlock(&c.lock)
    },3)
    return ture,ture
  }
  if c.qcount > 0{
    qp := chanbuf(c,c.recvx)
    if raceenabled{
      raceacquire(qp)
      raceacquire(qp)
    }
    if ep != nil{
      typedememove(c.elemtype,ep,qp)
    }
    typedememove(c.elemtype,qp)
    c.recvx++
    if c.recvx == c.dataqsiz{
      c.recvx = 0
    }
    c.qcount--
    unlock(&c.lock)
    return true,true
  }
  if !block{
    unlock(&c.lock)
    return false,false
  }
  gp := getg()
  mysg := acquireSudog()
  mysg.releasetime = 0
  if t0 != 0{
    mysg.releasetime = -1
  }
  mysg.elem = ep
  mysg.waitlink = nil
  gp.waiting = mysg
  mysg.g = gp
  mysg.isSelect = false
  mysg.c = c
  gp.param = nil
  c.recvq.enqueue(mysg)
  gopark(chanparkcommit,unsafe.Pointer(&c.lock),waitReasonChanReceive,traceEvoGoBlockRecv,2)
  if mysg != gp.waiting{
    throw("g waiting list is corrupted")
  }
  gp.waiting = nil
  gp.acquireStackChans = false
  if mysg.releasetime > 0{
    blockevent(mysg.releasetime-t0,2)
  }
  closed := gp.param == nil
  gp.param = nil
  mysg.c = nil
  releaseSudog(mysg)
  return true,!closed
}
```
### 关闭channel

```go
func closechan(c *hchan){
  if c == nil{
    panic(plainError("close of nil channel"))
  }
  lock(&c.lock)
  if c.closed != 0{
    unlock(&c.lock)
    panic(plainError("closd of closed channel"))
  }
  c.closed = 1
  var glist gList
  for{
    sg := c.recvq.dequeue
    if sg == nil{
      break
    }
    if sg.elem !=nil{
      typedmemclr(c.elemtype,sg.elem)
      sg.elem = nil
    }
    gp := sg.g
    gp.param = nil
    if raceenabled{
      raceacquire(gp,c.raceaddr())
    }
    glist.push(gp)
  }
  for{
    sg := c.sendq.dequeue()
    if sg == nil{
      break
    }
    sg.elem = nil
    if sg.releasetime != 0{
      sg.releasetime = cputicks()
    }
    gp := sg.g
    gp.param = nil
    if raceenabled{
      raceacquire(gp,c.raceaddr())
    }
    glist.push(gp)
  }
  unlock(&c.lock)
  for !glist.empty(){
    gp := glist.pop()
    gp.schedlink = 0
    goready(gp,3)
  }
}
```

hchan结构体主要组成成分有四个：

- 用来保存goroutine之间传递数据的循环链表 ==> buf
- 用来记录此循环链表当前发送或者接受数据的下标值 ==> sendx和recvx
- 用于保存该chan发送和从该chan接收数据的goroutine队列 ==> sendq和recvq
- 保证channel写入和读取数据时线程安全的锁 ==> lock

```go
//G1
func sendTask(taskList []Task){
    ch := make(chan Task,4)//初始化长度为4的channel
    for _,task := range taskList{
        ch <- task//发送任务到channel
 	}
}
//G2
func handleTask(ch chan Task){
    for{
        task := <-ch//接受任务
        process(task)//处理任务
    }
}
```

ch是长度为4的带缓冲的channel，G1是发送者，G2是接受者

- 初始hchan结构体的buf为空，sendx和recvx均为0
- 当G1向ch里发送数据时，首先会对buf加锁，然后将数据copy到buf中，然后sendx++,然后再释放对buf的锁。
- 当G2消费ch的时候，首先是对buf加锁，然后将buf中的数据copy到task变量对应的内存中，然后recvx++，并释放锁。

可以发现整个过程中，G1和G2没有共享内存，底层是通过hchan结构体的buf并使用copy内存的方式进行通信的。

#### 那么当chanel中的缓存存满了之后会发生什么呢？

当G1向buf已经满了的ch发送数据的时候，检测到hchan的buf已经满了，会通知调度器，调度器会将G1的状态设置为waiting, 并移除与线程M的联系，然后从P的runqueue中选择一个goroutine在线程M中执行，此时G1就是阻塞状态。当G1变为waiting状态后，会创建一个代表自己的sudog的结构，然后放到sendq这个list中，sudog结构中保存了channel相关的变量的指针(如果该Goroutine是sender，那么保存的是待发送数据的变量的地址，如果是receiver则为接收数据的变量的地址，之所以是地址，前面我们提到在传输数据的时候使用的是copy的方式)，当G2从ch中接收一个数据时，会通知调度器，设置G1的状态为runnable，然后将加入P的runqueue里，等待线程执行.



#### 如果是前面我们是假设G1先运行，如果G2先运行会怎么样？

如果G2先运行，那么G2会从一个empty的channel里取数据，这个时候G2就会阻塞，和前面介绍的G1阻塞一样，G2也会创建一个sudog结构体，保存接收数据的变量的地址，但是该sudog结构体是放到了recvq列表里。当G1向ch发送数据的时候，为了提升效率，**runtime并不会对hchan结构体题的buf进行加锁，而是直接将G1里的发送到ch的数据copy到了G2 sudog里对应的elem指向的内存地址！【不通过buf】**



#### 为什么G1向缓存满了的channel中发送数据时被阻塞，在G2后来接收时，不将阻塞的G1发送的数据直接拷贝到G2中呢？

这是因为channel中的数据时队列的，要保证顺序，当有消费者G2接收数据时，需要先接收缓存中的数据。



#### 多个goroutine向有缓存的channel接收发送数据时，是可以保证顺序的吗？

不能，channel中的数据遵循先进先出原则，每一个goroutine并不能保证先从channel中获取数据，或者发送数据，但是先执行的goroutine与后执行的goroutine在channel中获取的数据肯定是有序的。

#### channel为什么是线程安全的？

在对buf的数据进行入队和出队的操作时，为当前channel使用了互斥锁，防止多个线程并发修改数据