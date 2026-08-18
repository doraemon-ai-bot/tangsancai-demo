# 💃 乐舞胡旋 (Hu Xuan Dance)

> **数字化非遗互动装置** | 多模态穿搭感应 · 实时动作捕捉 · 盛唐三彩乐舞

《乐舞胡旋》是一个结合 **AI 穿搭色彩感应** 与 **MediaPipe 实时动作捕捉** 的数字化非遗展项原型。体验者通过自身的今日穿搭（OOTD）唤醒相匹配的大唐三彩乐俑（红、蓝、黑、白、灰五大经典釉色），并通过简单的肢体动作（举左手、张双臂）开启大唐胡旋舞与釉色换装大秀。

---

## 🎬 展项互动全流程 (Interactive Workflow)

```mermaid
graph TD
    A["1. 待机招揽 (STANDBY_LOOP)<br/>播放 video/intro.mp4 招揽动画<br/>有人走近自动感应穿搭颜色"] 
    -->|人站立满 5 秒| B["2. 开启拉帘 (INTRO_REVEAL)<br/>拉开黑色金丝帷幕 (video/curtain.mp4)<br/>底层呈现对应颜色的唐俑 0 秒首帧"]
    B -->|拉帘完成| C["3. 独立出场视频 (REVEAL_VIDEO)<br/>无遮挡播放完整出场视频 (1_reveal_{color}.mp4)"]
    C -->|出场播放完毕| D["4. 举左手挑战 (STANDBY_WAIT)<br/>定格出场末帧，检测用户举起左手"]
    D -->|举起左手 400ms| E["5. 胡旋舞大秀 (DANCE_LOOP)<br/>播放唐舞视频 (video/{color}_dance.mp4)"]
    E -->|舞蹈完成 + 保持/重新张开双臂| F["6. 连环换装旋转秀 (SPIN_TRANSITION)<br/>轮播三彩、青花、金釉服饰变幻"]
    F -->|放下双臂 / 5s未抬臂| G["7. 关帘谢幕 (OUTRO_VIDEO)<br/>关帘谢幕 + 随机 1/50 盛唐典雅祝福语"]
    E -->|未张臂| G
    G -->|谢幕完毕| A
```

---

## 🎨 五大盛唐三彩角色 (The 5 Color Figurines)

- 🔴 **反弹琵琶 · 绯红霓裳** (`red`) — 祝福语：鸿运当头，锦绣前程
- 🔵 **大唐拂袖 · 天青呈祥** (`blue`) — 祝福语：福寿绵长，皆得所愿
- 🖤 **仙人指路 · 水墨乐姬** (`black`) — 祝福语：万象更新，顺遂无忧
- ⚪ **执乐仕女 · 皎白霓裳** (`white`) — 祝福语：岁岁平安，吉庆有余
- 🩶 **执乐仕女 · 苍灰古韵** (`gray`) — 祝福语：吉祥如意，福泽绵长

---

## 🚀 快速开始 (Quick Start)

这是一个纯前端项目，无需复杂编译环境：

### 1. 本地网页服务 (Local Hosting)
在项目根目录下运行：

```bash
# 使用 Python3 启动静态服务器
python3 -m http.server 8000
```
在 Chrome 浏览器中访问：**`http://localhost:8000`**

### 2. 本地 AI 色彩识别（可选）
项目支持配合本地运行的 Ollama VLM (Moondream) 模型进行实时穿搭识别：

```bash
# 启动 Ollama 服务 (允许跨域)
OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0" ./ollama serve

# 在另一个终端拉取轻量级 Moondream 视觉模型
./ollama pull moondream
```
*注：若未启动本地 AI 服务，前端将自动启用离线智能色彩匹配降级模式，不影响主流程体验。*

---

## 🛠️ 快捷调试 (Developer Cheatsheet)

- 🖱️ **手动点击触发**：在无摄像头的开发机上调试时，直接**用鼠标点击网页空白区域**即可手动步进跳过当前动作挑战，快速测试完整流程。
- 🔍 **查看祝福语库**：完整 50 首盛唐古风祝福语清单详见 [blessings_database.md](blessings_database.md)。

---

祝您大唐之旅愉快！
