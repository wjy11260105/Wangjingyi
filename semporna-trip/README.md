# 仙本那旅行手账

适用于 2026 年 8 月 14–22 日仙本那旅行的独立管理网页，不影响现有日程和人生管理系统。

## 功能

- 九天每日行程与时间安排
- 跳岛、潜水、住宿、交通等分类记录
- 想做的事及完成状态
- 每日学习内容、个人收获和每日感悟
- 人民币/马币在线汇率换算、常用马来语、潜水和在地知识
- 预算、计划费用和实际支出
- 证件、潜水装备、健康、衣物和数码行前清单
- Supabase 邮箱登录及手机、电脑同步

## 在线预览

<https://htmlpreview.github.io/?https://github.com/wjy11260105/Wangjingyi/blob/cursor/schedule-manager-page-5167/semporna-trip/index.html>

## 开启云端同步

1. 在 Supabase Dashboard 打开 SQL Editor
2. 完整执行根目录的 `supabase-semporna-trip.sql`
3. 在 Authentication → URL Configuration 的 Redirect URLs 中加入 `https://htmlpreview.github.io/**`
4. 打开旅行网页，用现有 Supabase 邮箱账号登录
5. 手机和电脑登录同一账号

数据采用本地优先和按 `updated_at` 合并的同步方式。网络失败时，本地记录会保留；数据库启用 RLS，每个账号只能访问自己的旅行数据。

## 说明

8月15–20日的接送、住宿、OW/AOW课程及诗巴丹 Fun Dive 已按照预订资料整理。网页不会保存预订文件中的护照号、银行账号或私人联系方式。

潜点、接送与具体集合时间仍需根据旅行机构通知及天气海况确认。潜水后应根据潜水机构、电脑表和医生建议预留足够的禁飞间隔。
