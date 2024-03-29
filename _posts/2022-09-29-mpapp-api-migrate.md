---
layout: post
title: 小程序接口服务迁移
date: 2022-09-29 11:38:10 +0800
categories: 小程序
---

# 接口服务迁移重写

前情提要：[腾讯云开发预备收费和个人小程序的迁移](/cloudbase-miniprogram-future)。 

经过一小段时间的拖延，最后还是完成了小程序接口服务从腾讯云函数迁移至 restful api 服务。使用了 nestjs + mongoose。数据库一样使用了 mongodb，和之间几乎一样的 api 让迁移阻碍少了很多。

这里也不再说一些项目技术选用什么的，主要还是讲一下一些比较值得说的在迁移中遇到的问题。

## 数据库迁移

腾讯云开发数据库导出 json 的话，_id 会被默认为 string 类型。而如果在 mongoose 中未在 schema 中指定 _id 为 string 类型的话，会出现 `cast id ...  问题`。因为 mongoose 会默认 _id 类型为 ObjectId。也就是说，可能出现两种不同类型的 _id，这会在数据 update 或者 remove 时出现异常。

我的处理方式是给每一个集合的 _id 手动设置为 string 类型。那在 create 的时候就会是 string 类型的 _id。

```javascript
// schema
@Schema()
// ... 省略
@Prop()
_id: string;

// service
await this.UserModel.create({
  _id: new mongoose.Types.ObjectId(),
  ...others
})
```

## 用户信息绑定

原本用户信息表仅仅保存了用户的 openId。因为云开发具有天然的鉴权机制，所以在用户无感知的情况下就可以拿到用户在该小程序中的唯一 id，也就是 openId。而新的接口服务，不再依赖于云开发的鉴权机制，统一使用邮箱 + 密码的方式注册登录。这就有一个用户数据迁移，openId 绑定邮箱的问题了。

当一个用户刚使用新的接口服务，会被提示"未登录"，如果需要继续使用，就必须进行注册。

注意下面省略了邮箱收取验证码并进行校验等安全流程，只描述主要流程。

### 注册

因为要关联用户的 openId 到用户新建的邮箱，而服务端是不明确用户的 openId 指的是谁，所以需要在一段时间内从原本的云开发服务中拿到用户的 openId。云开发获取的 openId 是能信任的。

1. 如果该 openId 查询到的用户信息已有邮箱和密码，返回用户已绑定并注册账户。
2. 如果该 openId 查询到的用户信息中邮箱和密码为空，则走注册流程，将用户填写的密码和邮箱写入到用户表中。

### 登录

用户直接使用邮箱和密码登录。但登录还要处理 openId 问题。

如果用户已经注册过了，即使用了不同的手机进行小程序登录，也应该保持注册邮箱的那个 openId 。这可能会和注册冲突，因为注册时也用到了openId。所以目前是判断如果登录用户的 openId 和云开发返回的 openId 不一致，提示目前不支持换设备登录。这个限制会在一段时间后移除。

最终的目的是持有邮箱和密码就可以在任何设备进行登录，目前的做法是为了方便用户正确的迁移账户数据。

### 服务部署

在最后一刻我才回想起来，小程序接口服务需要 https 不说，还需要该服务器在国内备案，我买的轻量应用服务器在新加坡😠。搜索无果后，没办法，找了一个勉强能使用的方法：使用云函数中转请求。

云函数大概的长这样：

```js
return new Promise((resolve, reject) => {
    request({
      url,
      headers,
      method: method || 'get',
      body: data,
      json: true
    }, (error, response, body) => {
      if (!error) {
        try {
          resolve({
            statusCode: response.statusCode,
            data: body
          })
        } catch (e) {
          reject()
        }
      }
    })
  })
```

使用云函数的缺点就是还不能完全摆脱云开发，每月还得付费。计划等用户数据迁移完成后，买个国内的服务器然后备案。还是不走捷径了。💔。
