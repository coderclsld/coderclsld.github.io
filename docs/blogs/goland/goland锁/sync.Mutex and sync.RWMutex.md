## sync.Mutex和symc.RWMutex

### 互斥锁sync.Mutex

`Mutex.lock()`获取锁
`Mutex.Unlock()`释放锁
在 Lock 和 Unlock 方法之间的代码段称为资源的临界区，这一区间的代码是严格被锁保护的，是线程安全的，任何一个时间点最多只能有一个goroutine在执行。

#### sync.Mutex的数据结构

```go
type Mutex struct{
	state int32
	sema uint32
}
```
sync.Mutex由两个字段构成，state用来代表当前互斥锁处于的状态，sema用于控制锁状态的信号量
互斥锁主要记录了如下四种状态：

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb72ab82c1a044f2ba460f472af7bf96~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)

waiter_num：记录当前等待抢这个锁的goroutine数量
starving：当前锁时候处于饥饿状态，0：正常状态，1：饥饿状态
woken：当前锁是否有goroutine已被唤醒。0：没有goroutine被唤醒，1：有goroutine正在加锁过程
locked：当前锁是否被goroutine持有。0：未被持有，1：已被持有
sema信号量的作用：当持有锁的goroutine释放锁后，会释放sema信号量，这个信号量会被唤醒之前抢锁阻塞的goroutine来获取锁

#### 锁的两种模式：正常模式和饥饿模式

正常模式下，所有阻塞在等待队列中的goroutine会按顺序进行锁获取，当唤醒一个等待队列中的goroutine时，此goroutine并不会直接获取到锁，而是会和新请求锁的goroutine竞争。    通常新请求锁的goroutine更容易获取锁，这是因为新请求锁的goroutine正在占用cpu片执行，大概率可以直接执行到获取到锁的逻辑。
饥饿模式下， 新请求锁的goroutine不会进行锁获取，而是加入到队列尾部阻塞等待获取锁。
饥饿模式的触发条件：当一个goroutine等待锁的时间超过了1ms，互斥锁会切换到饥饿模式
饥饿模式的取消条件：当获取到这个锁的goroutine是等待锁队列中的最后一个goroutine，互斥锁会切换到正常模式；当获取到锁的这个goroutine的等待时间在1ms之内，互斥锁会切换到正常模式。

#### 注意事项：

1、在一个goroutine中执行Lock()加锁成功后，不要再重复进行加锁，否则会panic
2、在Lock()之前执行Unlock()释放锁会panic
3、对于同一把锁，可以在一个goroutine中执行Lock加锁成功后，可以在另一个goroutine中执行Unlock释放锁。

### 读写锁sync.RWMutex

> 读写锁不限制对资源的并发读，但是读写、写写操作无法并行执行

`RLock()`申请读锁
`RUnlock()`解除读锁
`Lock()`申请写锁
`Unlock()`解除写锁

#### sync.RWMutex的数据结构

```go
type RWMutex struct{
	w Mutex //复用互斥锁
	writeSem uint32 //写锁监听读锁释放的信号量
	readerSem uint32 //读锁监听写锁释放的信号量
	readerCount uint32 //当前正在执行读操作的数量
	readerWait int32 //当写操作被阻塞时，需要等待读操作完成的个数
}
```

#### 读操作如何防止并发读写问题？

 - RLock()申请读锁，每次执行该函数都会对readerCount++，此时当有写操作执行Lock()时会判断readerCount > 0，就会被阻塞
 - RUnLock()解除读锁，执行readerCount--，释放信号量唤醒等待写操作的goroutine

#### 写操作如何防止并发读写、并发写写问题？

 - Lock()申请写锁，获取互斥锁，此时会阻塞其他的写操作，并将readerCount置为-1，当有读操作进来时发现readerCount = -1，就知道了有写操作在进行，阻塞。
 - Unlock()解除写锁，会先通知所有阻塞的读操作goroutine，然后才会释放持有的互斥锁。

#### 为什么写操作不会被饿死？

 - 什么事写操作被饿死？这是由于写操作要等待读操作结束后才可以获取锁，而写操作在等待期间可能还有新的读操作持续到来，如果写操作等待所有的读操作结束，很可能会一直阻塞，这种现象叫做写操作被饿死
 - 通过RWMutex结构体中你的readerWait属性可以完美解决这个问题，当写操作到来是，会把RWMutex.readerCount值拷贝到RWMutex.readerWait中，用于标记在写操作面前的读操作个数，前面的读操作结束后，除了会递减RWMutex.readerCount，还会递减RWMutex.readerWait值，当RWMutex.readWait值变为0时唤醒写操作。

