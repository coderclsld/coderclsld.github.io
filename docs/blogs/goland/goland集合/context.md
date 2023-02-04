## context
>每个请求都在自己的goroutine中处理，处理程序经常要启动其他goroutine访问数据库或者是rpc服务，当一个请求被取消或者是处理超时时，在所有该请求上工作的goroutine都应该迅速退出，以便系统回收资源。

### 作用
Context结构体中的方法分为两种，第一种是value是进行传值的，第二种是deadline、done、err这三个是进行控制的
```go
type Context interface{
	Deadline()(deadline time.Time,ok bool)
	Done() <-chan struct{}
	Err() error
	Value(key any)any
}
```
#### 传值
WithValue创建一个新的Context，这个新的Context保存着一份parentContext的副本，同时也保存了WithValue函数接收的key-val对。WithValue其实返回一个名为valueCtx类型的实例，valueCtx实现了Context接口
```go
func WithValue(parent Context,key,val any)Context
type valueCtx struct{
	Context
	key,val any
}
```
下面代码会展示context进行传值的过程
```go
package main

import (
    "context"
    "fmt"
)

func f3(ctx context.Context, req any) {
    fmt.Println(ctx.Value("key0"))
    fmt.Println(ctx.Value("key1"))
    fmt.Println(ctx.Value("key2"))
}

func f2(ctx context.Context, req any) {
    ctx2 := context.WithValue(ctx, "key2", "value2")
    f3(ctx2, req)
}

func f1(ctx context.Context, req any) {
    ctx1 := context.WithValue(ctx, "key1", "value1")
    f2(ctx1, req)
}

func handle(ctx context.Context, req any) {
    ctx0 := context.WithValue(ctx, "key0", "value0")
    f1(ctx0, req)
}

func main() {
    rootCtx := context.Background()
    handle(rootCtx, "hello")
}

$go run main.go
value0
value1
value2

```
基于该种特性，可以应用到调用链，传递函数链路的值
#### 控制
##### 主动取消
WithCancel函数为上下文提供了可取消的控制机子，他是整个context包控制机制的基础。
```go
package main

import (
    "context"
    "fmt"
)

func main() {
    gen := func(ctx context.Context) <-chan int {
        dst := make(chan int)
        n := 1
        go func() {
            for {
                select {
                case <-ctx.Done():
                    return // returning not to leak the goroutine
                case dst <- n:
                    n++
                }
            }
        }()
        return dst
    }

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel() // cancel when we are finished consuming integers

    for n := range gen(ctx) {
        fmt.Println(n)
        if n == 5 {
            break
        }
    }
}
```
WithCancel函数除了返回一个具有可取消属性的Context实例外，还返回了一个cancelFunc，这个cancelFunc只要被调用，即调用者发出“取消”信号，异步调用中启动的goroutine就应该放下手头工作，老老实实地退出。
##### 超时取消
WithDeadline和WithTimeout函数，timerCtx基于cancelCtx提供了一种基于deadline的取消控制机制

### 参考
[通过实例理解Go标准库context包](https://tonybai.com/2022/11/08/understand-go-context-by-example/)
[剖析Goland Context：从使用场景到源码分析](https://xie.infoq.cn/article/3e18dd6d335d1a6ab552a88e8)

