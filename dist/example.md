# 推送服务调研

---

## 核心需求
* 多维条件筛选待推送用户
* 将通知推送到应用
* 推送任务调度和管理
* 多业务多app支持

???
推送服务主要解决服务端向产品用户推送通知消息的问题，比如美拍中推送开始直播的通知，推送系统信息
或用户私信等等。要达到这个目的有两个核心问题需要解决，1. 消息推送给谁。2. 消息如何到达。

无论是android还是iOS，一个应用被安装则可以看做一个实例，为了唯一区分一个实例，我们为其分配一个
唯一ID，这个ID可以根据业务不同而不同，比如对于注册用户app，可以使用uid，对于非注册app，则可以自动
生成并维护一个ClientID。 这个实例ID可以关联用户（注册app）或机主（非注册app）相关信息，比如用户
基本信息（性别，年龄等）或兴趣信息（读书，电影等），业务可以根据记录的信息，或离线数据分析的结果
来筛选出特定实例ID进行推送。因此推送服务至少需要支持通过一定查询条件推送特定用户的功能。

对于筛选出的用户，需要解决将消息可靠投递的问题，目前我们基于MQTT研发的bifrost服务可以实现将消息
可靠投递到设备的需求。

解决以上两个问题虽然可以筛选用户并下发消息，但对于推送任务成功与否，任务进度等都无法得到，因此我们
需要一个有效的任务调度管理和状态反馈的机制，实现任务定时推送，状态进度反馈，任务执行结果报告等功能。
以达到向业务方反馈的目的。

除了以上核心问题外，推送服务需要支持不同业务不同app的消息推送，比如美拍，美颜相机，潮自拍等都是
独立的产品，推送的内容时机等可能都有差异，推送服务需要支持不同业务创建不同app，app的使用和接入
需要有安全的身份验证和授权控制，对用户提供app信息的创建和管理等功能。

综上所述，一个正常的推送流程可能如下：
1. 创建app，填写app相关信息和唯一标示，唯一表示用来移动设备上的统一推送服务将消息路由到特定app。
2. 创建推送消息，填写消息标题和内容，填写推送目标，推送目标可以是一个筛选条件（比如用户标签等）。
3. 提交推送任务到任务管理模块，任务管理分析推送任务并调度执行（定时或立即执行）。
4. 任务执行，用户可以随时登陆管理后台查询任务执行状态，推送到达率统计等信息。

任务的创建可以人工在管理后台操作，也可以由业务调用推送服务接口提交。

---

## 服务架构

### 整体业务架构

```
+--------+     +--------------+      +-----------+
| Client | <-- |              |      |           |
|--------|     |              |      |           |
| Client | <-- | Push Service | <--  | AppServer |
|--------|     |              |      |           |
| Client | <-- |              |      |           |
+--------+     +--------------+      +-----------+
```

---

#### Client
Client是指一个App实例，用唯一ID区分，比如统一为ClientID。一个Client向bifrost订阅自身topic。
后续消息通过topic下发到具体Client。

#### Push Service
Push Service则是我们的推送服务。其有多个核心模块组成，实现了第三方业务接入，App注册，消息推送
等核心功能。其具体架构后面会详细讨论。

#### AppServer
AppServer是App对应的业务方Server，通常情况下，消息推送只是一个App众多功能的一个，App的业务
逻辑对应自己的AppServer， AppServer 可以调用Push Service 提供的Server SDK发起消息推送请求。

---

### 推送服务架构(Push Service)

```
+--------------------------+--------------+
| WEB Console | Server SDK |              |
+--------------------------+ Client SDK   |
|      RESTful APIs        |              |
+--------------------------+--------------+
|           Push Service core             |
| +----------------------------+--------+ |
| |Task Scheduler| APP manager | Pusher | |
| +-------------------------------------+ |
| | MySQL  | Redis | Etcd |   bifrost   | |
| +-------------------------------------+ |
+-----------------------------------------+
```

---

#### WEB Console
WEB Console是整个推送服务的后台管理界面，所有需要跟业务交互的功能模块都在WEB Console中体现，
比如创建一个app，发布一条消息，查询任务历史等等。WEB Console 通过RESTful API跟推送服务核心
模块交互。

#### Server SDK
Server SDK是提供给业务方Server端的SDK，其封装了推送服务RESTful API，跟WEB Console具有同等
的功能，业务方可以方便的在自己代码逻辑通过Server SDK访问推送服务的任务状态，创建推送消息等。

#### RESTful API
RESTful API 提供推送服务核心功能接口，是用户和Server端跟推送服务交互的唯一通道，也是WEB Console
和Server SDK的底层支持。

#### Client SDK
Client SDK 是移动端App使用的SDK，负责向服务端注册自身，权限验证，接收消息等功能，其底层通道采用
我们的MQTT服务bifrost，其即支持接收单播消息也可以通过订阅topic接收多播消息。

---

#### Task Scheduler
Task Scheduler 负责推送任务的调度，执行，状态监督和结果反馈。目前调度方面只考虑定时执行或立即
执行。推送的设备有些在线有些离线，Task Scheduler 应该合理区分不同情况，另外，任务中断时需要有
自动或收到恢复任务的能力。

#### APP Manager
App Manager 用于管理第三方业务注册App，查看App，App接口权限验证等相关功能。

#### Pusher
Pusher 执行具体的推送任务，由于一次推送涉及到成千上万设备，设备有的在线有的离线，Pusher负责推送
在线设备，记录推送进度，存储离线消息，并且在消息有效期内，当设备上线时及时推送。

---

#### bifrost
bifrost 是一个MQTT的实现，完成在线设备的消息可靠推送，设备上线通知Pusher等功能。

#### MySQL， Redis， Etcd
从上面功能模块可以看到，我们有很多业务数据，客户端信息，app信息，任务数据等需要存储，初步考虑会
引入MySQL和Redis，不过存储哪些内容，如何存储暂时还没有定论。Etcd考虑用在内部模块之间的服务发现
和Task Scheduler任务的持久化和分布式协调，这里如何取用，暂时也没有想清楚。

---


## 数据模型
这里的数据模型都是初步设想，肯定会有错误或不全面的地方，这是只是给出一个示例，让大家有个直观的感受，
至于具体要存哪些数据，如何存储，还需要后续的仔细沟通和思考。

---

### App 信息
App 信息用来存储业务方创建的app相关数据，消息的推送都是针对一个app进行。

| appid | appname | appkey | serverkey | service |
|-------|---------|--------|-----------|---------|
| 12345 | com.meitu.meipai | afekkfa|faek|   美拍|

数据的访问基本是列出或查询app的信息。

* appid 一个app的唯一标示
* appname 移动设备中推送服务SDK定位具体app的标示（android为例）
* appkey 客户端app接入推送服务的身份验证信息
* serverkey 业务端Server SDK访问推送服务接口的身份验证信息
* Service 业务相关信息

---

### Task 信息
Task 信息存储了一个推送任务相关的信息，包括任务关联应用，任务执行状态等。

| taskid | appid | msgid | status | time | target |
|--------|-------|-------|--------|------|--------|
| 123    | 12345 | 1     | done   | 2016 | shafreeck|
* taskid 任务的唯一标示
* appid 任务关联的appid
* msgid 任务关联的消息
* status 任务执行状态
* time 任务创建时间
* target 推送目标， 可以是一个客户端信息的查询条件

---

### Message 信息

存储一条消息的具体信息

| msgid | title | text | time  | type |
|-------|-------|------|-------|------|
| 1 | hello | this is a text | 2016 | notification |

* msgid 消息的唯一标识
* title 消息标题
* text 消息正文
* time 消息创建时间
* type 消息类型， 通知或者是透传

---

### 客户端信息

存储每一个安装客户端实例相关信息

| ClientID | appid | location | tag | login | username |
|----------|-------|----------|-----|------------|----------|
|famekfkea | 12345 | Beijing  | 爱读书| true | shafreeck |

* ClientID 客户端实例的唯一标识，也是消息推送的唯一标识
* appid 客户端属于哪个app
* location 用户所在地理位置
* tag 用户兴趣标签
* login 是否是登陆用户
* username 登陆用户的用户名

---

### 推送中间状态数据（TBD）

存储推送过程的中间状态，以及离线消息。推送中间状态包括推送进度等内容，推送进度记录推送当前推送到
的ClientID。离线消息初步考虑用redis 存储，ClientID 为Key，消息列表存储在list中

---

## 待定问题

* 授权与验证
* 客户端推送反馈
* 客户端防杀死


???
## 里程碑规划
由于整个服务有多个模块组成，每个模块可能需要多团队协作完成，另外具体实现方案也缺少足够的调研还没有
确定，所以这里的里程碑先不设置deadline，只简单给出大体阶段和阶段性目标。

### 推送服务方案确定
* 调研业务使用第三方推送的痛点和核心需求
* 确定bifrost足够满足需求
* 确认每个核心模块的实现方案
* 确定模块的必要性也优先级

### 实现核心Pusher 推送模块

* 实现Pusher 进度管理
* 实现Pusher 离线消息存储和下发
* 实现在线设备消息推送和到达率统计

### 实现应用接入

* 实现应用的创建
* 实现应用接入权限验证

### 实现任务调度模块

* 支持创建，执行，定时执行推送任务
* 支持推送历史查询，推送状态查看

### 实现RESTful API， Server SDK， ClientID

* 实现完整的业务接入和消息推送方案

### 实现WEB Console

* 提供WEB界面，用来提交推送任务，查看任务状态，到达率统计等

---

## 参考资料
```
https://github.com/android-cn/topics/issues/4
http://blog.umeng.com/products/4518.html
https://www.zhihu.com/question/31882775
https://leancloud.cn/docs/push_guide.html
http://www.csdn.net/article/2013-09-10/2816885-8-push-service-for-mobile-developers
http://push.baidu.com/doc/python/api
https://developer.apple.com/library/mac/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/Introduction.html#//apple_ref/doc/uid/TP40008194-CH1-SW1
http://carnival.io/
https://onesignal.com/
https://www.urbanairship.com/
https://firebase.google.com/docs/cloud-messaging/
http://docs.urbanairship.com/reference/app_keys_secrets.html
```

