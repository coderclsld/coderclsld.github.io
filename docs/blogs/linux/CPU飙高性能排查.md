## cpu load比较高，怎么排查？
### linux进程状态
D（task_uninterruptiblr） 不可中断睡眠态，这种状态的进程处于睡眠中，并且不允许被其他进程或中断(异步信号)打断。因此这种状态的进程，是无法使用kill -9杀死的(kill也是一种信号)，除非重启系统(没错，就是这么头硬)。不过这种状态一般由I/O等待(比如磁盘I/O、网络I/O、外设I/O等)引起，出现时间非常短暂，大多很难被PS或者TOP命令捕获(除非I/O HANG死)。
R（task_running）可执行态，这种状态的进程都位于CPU的可执行队列中，正在运行或者正在等待运行
S（task_interruptible）可中断睡眠，这种状态的进程虽然也处于睡眠中，但是是允许被中断的。这种进程一般在等待某事件的发生（比如socket连接、信号量等），而被挂起。一旦这些时间完成，进程将被唤醒转为R态。如果不在高负载时期，系统中大部分进程都处于S态。SLEEP态进程不会占用任何CPU资源。
T&t（task_stop&task_traced）暂停&跟踪态，这种两种状态的进程都处于运行停止的状态。不同之处是暂停态一般由于收到SIGSTOP、SIGTSTP、SIGTTIN、SIGTTOUT四种信号被停止，而跟踪态是由于进程被另一个进程跟踪引起(比如gdb断点），暂停态进程会释放所有占用资源。
Z (exit_zomble) 僵尸态，这种状态的进程实际上已经结束了，但是父进程还没有回收它的资源（比如进程的描述符、PID等）
X（exit_dead）死亡态，进程的真正结束态

### load average(平均负载)
LoadAverage = calc_load(Task_RUNNING+TASK_UNINTERRUPTIBLE,n)
平均负载(load average)是指系统的运行队列的平均利用率，也可以认为是可运行进程的平均数。
top命令中load average显示的是最近1分钟、5分钟和15分钟的系统平均负载

### CPU使用率
CPU的时间分片一般可分为4大类：
用户进程运行时间 - User Time
系统内核运行时间 - System Time
空闲时间 - Idle Time
被抢占时间 - Steal Time
除了Idle Time外，其余时间CPU都处于工作运行状态。

us：用户进程空间中未改变过优先级的进程占用CPU百分比
sy：内核空间占用CPU百分比
ni：用户进程空间内改变过优先级的进程占用CPU百分比
id：空闲时间百分比
wa：空闲&等待I/O的时间百分比
hi：硬中断时间百分比
si：软中断时间百分比
st：虚拟化时被其余VM窃取时间百分比

### load高&CPU高
即load上涨是CPU负载上升导致

当go服务部署到线上了，发现有内存泄露，该怎么处理