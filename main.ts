const state = {
  turn: 0,
  selected: {},
  direction: 1,
  onlineUsers: 0
};

const sockets = new Set();

function broadcastOnlineCount() {
  const msg = JSON.stringify({
    type: "onlineCount",
    count: sockets.size
  });
  for (const ws of sockets) {
    try { ws.send(msg); } catch (err) {}
  }
}

function handler(req) {
  const upgrade = req.headers.get("upgrade");
  if (upgrade === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    sockets.add(socket);
    broadcastOnlineCount();

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "update") {
          state.turn = data.state.turn;
          state.selected = data.state.selected;
          state.direction = data.state.direction;
        }
        const all = JSON.stringify({ type: "state", state });
        for (const ws of sockets) {
          try { ws.send(all); } catch (err) {}
        }
      } catch (err) {}
    };

    socket.onclose = () => {
      sockets.delete(socket);
      broadcastOnlineCount();
    };

    return response;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>班级实时选人系统</title>
<style>
*{box-sizing:border-box;font-family:Arial,sans-serif}
body{max-width:1000px;margin:0 auto;padding:20px;background:#f5f7fa}
h1,h2{text-align:center}
.online{text-align:center;font-size:18px;font-weight:bold;color:#0d6efd;margin-bottom:10px}
.box{background:white;padding:20px;border-radius:12px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.leaders{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.leader{padding:10px 16px;background:#e3f2fd;border-radius:8px;font-weight:bold}
.leader.now{background:#0d6efd;color:white}
.users{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px}
.user{padding:10px;background:#eee;border-radius:6px;cursor:pointer;text-align:center}
.user.selected{background:#ccc;text-decoration:line-through;pointer-events:none}
</style>
</head>
<body>
<div class="online">当前在线：<span id="online_num">0</span> 人</div>
<h1>班级分组选人系统</h1>
<div class="box">
  <h2>当前轮到：<span id="current_leader"></span></h2>
  <div id="leader_list" class="leaders"></div>
</div>
<div class="box">
  <h2>候选人</h2>
  <div id="user_list" class="users"></div>
</div>
<script>
const leaders = ["1","2","3","4","5","6","7"];
const users = [
"胡嘉慧","李金柳","梁丽雯","廖庆烨","梁爽","苏雯慧","杨惠婷",
"陈杜娟","陈桦婷","邓吉定","范莉莉","甘微微","甘志青",
"黄春策","黄庆烽","黄绍恒","黄永棣","黄雨珊","黄梓煜",
"梁芳铭","陆桂永","李佳庆","刘嘉睿","李康","李明智",
"刘芮伶","梁诗彤","梁天佑","李彤宇","李文昊","梁馨日",
"梁雨馨","陆昭焯","陆竹风","缪礼涛","农璋翔","陶冠华",
"覃裕善","吴慧婷","韦金广","韦嘉烨","韦亮","韦烁华",
"韦云凌","谢天龙","谢钰华","杨思涵","周芳泽","周俊宇"
];

const ws = new WebSocket(location.origin.replace(/^http/, "ws"));
let state = { turn: 0, selected: {}, direction: 1 };

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === "state") {
    state = data.state;
    render();
  }
  if (data.type === "onlineCount") {
    document.getElementById("online_num").innerText = data.count;
  }
};

function render() {
  document.getElementById("current_leader").innerText = leaders[state.turn];
  const leaderEl = document.getElementById("leader_list");
  leaderEl.innerHTML = leaders.map((name, i) => {
    return \`<div class="leader \${i === state.turn ? 'now' : ''}">\${name}</div>\`;
  }).join("");

  const userEl = document.getElementById("user_list");
  userEl.innerHTML = users.map(name => {
    const sel = state.selected[name] ? "selected" : "";
    return \`<div class="user \${sel}" onclick="pick('\${name}')">\${name}</div>\`;
  }).join("");
}

function pick(name) {
  if (state.selected[name]) return;
  state.selected[name] = leaders[state.turn];

  state.turn += state.direction;
  if (state.turn >= leaders.length) {
    state.direction = -1;
    state.turn = leaders.length - 1;
  }
  if (state.turn < 0) {
    state.direction = 1;
    state.turn = 0;
  }

  ws.send(JSON.stringify({
    type: "update",
    state: state
  }));
  render();
}
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

Deno.serve(handler);
