## go服务限流熔断



### 限流

如果有大流量突然积增会导致原本达到平衡的服务器被打崩，所以需要进行限流，限流的作用就是保证访问量达到服务器最高的情况下，对多余的请求不做处理或者返回有效的提示信息。





### 熔断

熔断类比与保险丝，当电流过大的时候即服务返回的成功、失败的状态，当失败状态超过设置的阈值时断路器打开，请求就不能访问到真正的服务。